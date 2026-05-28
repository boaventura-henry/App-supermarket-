package com.example.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.data.model.PriceHistory
import com.example.data.model.Product
import com.example.data.model.User
import com.example.data.repository.AppRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

sealed class Screen {
    data object Login : Screen()
    data object SignUp : Screen()
    data object ForgotPassword : Screen()
    data object ProductList : Screen()
    data class AddEditProduct(val productId: Int? = null) : Screen()
    data object Dashboard : Screen()
    data object History : Screen()
}

enum class ProductSortField {
    NAME,
    QUANTITY
}

class MainViewModel(private val repository: AppRepository) : ViewModel() {

    private val _currentScreen = MutableStateFlow<Screen>(Screen.Login)
    val currentScreen: StateFlow<Screen> = _currentScreen.asStateFlow()

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    private val _authStateMessage = MutableStateFlow<String?>(null)
    val authStateMessage: StateFlow<String?> = _authStateMessage.asStateFlow()

    private val _authSuccessMessage = MutableStateFlow<String?>(null)
    val authSuccessMessage: StateFlow<String?> = _authSuccessMessage.asStateFlow()

    @OptIn(ExperimentalCoroutinesApi::class)
    val products: StateFlow<List<Product>> = _currentUser
        .flatMapLatest { user ->
            if (user == null) {
                flowOf(emptyList())
            } else {
                repository.getAllProducts(user.email)
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    @OptIn(ExperimentalCoroutinesApi::class)
    val priceHistory: StateFlow<List<PriceHistory>> = _currentUser
        .flatMapLatest { user ->
            if (user == null) {
                flowOf(emptyList())
            } else {
                repository.getPriceHistory(user.email)
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _searchQuery = MutableStateFlow("")
    val searchQuery = _searchQuery.asStateFlow()

    private val _supermarketFilter = MutableStateFlow("Todos")
    val supermarketFilter = _supermarketFilter.asStateFlow()

    private val _statusFilter = MutableStateFlow("Todos")
    val statusFilter = _statusFilter.asStateFlow()

    private val _productSortField = MutableStateFlow(ProductSortField.NAME)
    val productSortField = _productSortField.asStateFlow()

    private val _productSortAscending = MutableStateFlow(true)
    val productSortAscending = _productSortAscending.asStateFlow()

    private val filteredUnsortedProducts = combine(
        products,
        searchQuery,
        supermarketFilter,
        statusFilter
    ) { list, query, market, status ->
        list.filter { product ->
            val matchesQuery = product.name.contains(query, ignoreCase = true) ||
                product.brand.contains(query, ignoreCase = true)
            val matchesMarket = market == "Todos" || product.supermarket == market
            val matchesStatus = when (status) {
                "Comprados" -> product.isBought
                "Nao Comprados" -> !product.isBought
                else -> true
            }
            matchesQuery && matchesMarket && matchesStatus
        }
    }

    val filteredProducts: StateFlow<List<Product>> = combine(
        filteredUnsortedProducts,
        productSortField,
        productSortAscending
    ) { filtered, sortField, ascending ->
        val sorted = when (sortField) {
            ProductSortField.NAME -> filtered.sortedBy { it.name.lowercase(Locale.getDefault()) }
            ProductSortField.QUANTITY -> filtered.sortedWith(
                compareBy<Product> { it.quantity }.thenBy { it.name.lowercase(Locale.getDefault()) }
            )
        }

        if (ascending) sorted else sorted.asReversed()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val existingSupermarkets: StateFlow<List<String>> = products.map { list ->
        list.mapNotNull { it.supermarket }.filter { it.isNotBlank() }.distinct().sorted()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val existingProductNames: StateFlow<List<String>> = priceHistory.map { list ->
        list.map { it.productName }.distinct().sorted()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val historySupermarkets: StateFlow<List<String>> = priceHistory.map { list ->
        list.mapNotNull { it.supermarket }.filter { it.isNotBlank() }.distinct().sorted()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _historyProductFilter = MutableStateFlow("Todos")
    val historyProductFilter = _historyProductFilter.asStateFlow()

    private val _historySupermarketFilter = MutableStateFlow("Todos")
    val historySupermarketFilter = _historySupermarketFilter.asStateFlow()

    private val _historyMonthFilter = MutableStateFlow("Todos")
    val historyMonthFilter = _historyMonthFilter.asStateFlow()

    val filteredPriceHistory: StateFlow<List<PriceHistory>> = combine(
        priceHistory,
        historyProductFilter,
        historySupermarketFilter,
        historyMonthFilter
    ) { list, productName, market, month ->
        list.filter { history ->
            val matchesProduct = productName == "Todos" || history.productName == productName
            val matchesMarket = market == "Todos" || history.supermarket == market
            val formatter = SimpleDateFormat("MM/yyyy", Locale.getDefault())
            val matchesMonth = month == "Todos" || formatter.format(Date(history.timestamp)) == month
            matchesProduct && matchesMarket && matchesMonth
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val historyMonths: StateFlow<List<String>> = priceHistory.map { list ->
        val formatter = SimpleDateFormat("MM/yyyy", Locale.getDefault())
        list.map { formatter.format(Date(it.timestamp)) }.distinct()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _dashProductFilter = MutableStateFlow<String?>(null)
    val dashProductFilter = _dashProductFilter.asStateFlow()

    private val _dashSupermarketFilter = MutableStateFlow("Todos")
    val dashSupermarketFilter = _dashSupermarketFilter.asStateFlow()

    private val _dashMonthInterval = MutableStateFlow(6)
    val dashMonthInterval = _dashMonthInterval.asStateFlow()

    init {
        viewModelScope.launch {
            existingProductNames.collect { names ->
                if (_dashProductFilter.value == null && names.isNotEmpty()) {
                    _dashProductFilter.value = names.first()
                }
            }
        }
    }

    fun navigateTo(screen: Screen) {
        _currentScreen.value = screen
    }

    fun register(email: String, name: String, passHex: String, securityAnswer: String) {
        viewModelScope.launch {
            _authStateMessage.value = null
            _authSuccessMessage.value = null

            if (email.isBlank() || name.isBlank() || passHex.isBlank() || securityAnswer.isBlank()) {
                _authStateMessage.value = "Todos os campos sao obrigatorios!"
                return@launch
            }
            if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                _authStateMessage.value = "Formato de e-mail invalido!"
                return@launch
            }
            if (passHex.length < 6) {
                _authStateMessage.value = "A senha deve conter no minimo 6 caracteres!"
                return@launch
            }

            val existingUser = repository.getUserByEmail(email.lowercase().trim())
            if (existingUser != null) {
                _authStateMessage.value = "Este e-mail ja esta cadastrado!"
                return@launch
            }

            val user = User(
                email = email.lowercase().trim(),
                name = name.trim(),
                passwordPlain = passHex,
                securityAnswer = securityAnswer.lowercase().trim()
            )
            val result = repository.registerUser(user)
            if (result > 0) {
                _authSuccessMessage.value = "Conta criada com sucesso! Faca login."
                _currentScreen.value = Screen.Login
            } else {
                _authStateMessage.value = "Erro ao criar conta. Tente novamente."
            }
        }
    }

    fun login(email: String, passHex: String) {
        viewModelScope.launch {
            _authStateMessage.value = null
            _authSuccessMessage.value = null

            if (email.isBlank() || passHex.isBlank()) {
                _authStateMessage.value = "E-mail e senha sao obrigatorios!"
                return@launch
            }

            val user = repository.getUserByEmail(email.lowercase().trim())
            if (user == null || user.passwordPlain != passHex) {
                _authStateMessage.value = "E-mail ou senha incorretos!"
                return@launch
            }

            _currentUser.value = user
            _currentScreen.value = Screen.ProductList
            _searchQuery.value = ""
            _supermarketFilter.value = "Todos"
            _statusFilter.value = "Todos"
        }
    }

    fun recoverPassword(email: String, securityAnswer: String, onRecovered: (String) -> Unit) {
        viewModelScope.launch {
            _authStateMessage.value = null
            _authSuccessMessage.value = null

            if (email.isBlank() || securityAnswer.isBlank()) {
                _authStateMessage.value = "Preencha o e-mail e a resposta de seguranca!"
                return@launch
            }

            val user = repository.getUserByEmail(email.lowercase().trim())
            if (user == null) {
                _authStateMessage.value = "E-mail nao encontrado no sistema!"
                return@launch
            }

            if (user.securityAnswer.lowercase().trim() == securityAnswer.lowercase().trim()) {
                onRecovered(user.passwordPlain)
                _authSuccessMessage.value = "Recuperada! Sua senha e: ${user.passwordPlain}"
            } else {
                _authStateMessage.value = "Resposta de seguranca incorreta!"
            }
        }
    }

    fun logout() {
        _currentUser.value = null
        _currentScreen.value = Screen.Login
        _authStateMessage.value = null
        _authSuccessMessage.value = null
    }

    fun toggleProductBought(product: Product) {
        viewModelScope.launch {
            repository.toggleProductBought(product)
        }
    }

    fun saveProduct(
        id: Int,
        name: String,
        brand: String,
        quantityStr: String,
        unitPriceStr: String,
        supermarket: String?,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            val user = _currentUser.value
            if (user == null) {
                _authStateMessage.value = "Nenhum usuario logado!"
                return@launch
            }

            if (name.isBlank()) {
                _authStateMessage.value = "Nome do produto e obrigatorio!"
                return@launch
            }

            val quantity = ProductInputParser.parseOptionalNonNegativeDecimal(quantityStr)
            if (quantity == null) {
                _authStateMessage.value = "A quantidade deve ser um numero valido!"
                return@launch
            }

            val unitPrice = ProductInputParser.parseOptionalNonNegativeDecimal(unitPriceStr)
            if (unitPrice == null) {
                _authStateMessage.value = "O preco unitario deve ser um numero valido!"
                return@launch
            }

            val formattedSupermarket = supermarket?.trim()?.ifBlank { null }

            if (id == 0) {
                val newProduct = Product(
                    userId = user.email,
                    name = name.trim(),
                    brand = brand.trim(),
                    quantity = quantity,
                    unitPrice = unitPrice,
                    supermarket = formattedSupermarket,
                    timestamp = System.currentTimeMillis()
                )
                repository.insertProduct(newProduct)
            } else {
                val oldProduct = repository.getProductById(id)
                if (oldProduct != null) {
                    val shouldLogHistory = unitPrice > 0.0 &&
                        (oldProduct.unitPrice != unitPrice || oldProduct.supermarket != formattedSupermarket)
                    val updatedProduct = oldProduct.copy(
                        name = name.trim(),
                        brand = brand.trim(),
                        quantity = quantity,
                        unitPrice = unitPrice,
                        supermarket = formattedSupermarket
                    )
                    repository.updateProduct(updatedProduct, logHistory = shouldLogHistory)
                }
            }

            if (_dashProductFilter.value == null) {
                _dashProductFilter.value = name.trim()
            }

            onSuccess()
        }
    }

    fun saveQuickProduct(
        name: String,
        quantityStr: String,
        unitPriceStr: String,
        supermarket: String?,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        if (name.isBlank()) {
            onError("Informe o nome do produto.")
            return
        }

        if (ProductInputParser.parseOptionalNonNegativeDecimal(quantityStr) == null) {
            onError("Quantidade invalida.")
            return
        }

        if (ProductInputParser.parseOptionalNonNegativeDecimal(unitPriceStr) == null) {
            onError("Valor unitario invalido.")
            return
        }

        saveProduct(
            id = 0,
            name = name,
            brand = "",
            quantityStr = quantityStr,
            unitPriceStr = unitPriceStr,
            supermarket = supermarket,
            onSuccess = onSuccess
        )
    }

    fun updateProductQuantity(product: Product, quantityStr: String) {
        val quantity = ProductInputParser.parseOptionalNonNegativeDecimal(quantityStr) ?: return
        viewModelScope.launch {
            repository.updateProduct(product.copy(quantity = quantity), logHistory = false)
        }
    }

    fun updateProductUnitPrice(product: Product, unitPriceStr: String) {
        val unitPrice = ProductInputParser.parseOptionalNonNegativeDecimal(unitPriceStr) ?: return
        val shouldLogHistory = unitPrice > 0.0 && unitPrice != product.unitPrice
        viewModelScope.launch {
            repository.updateProduct(product.copy(unitPrice = unitPrice), logHistory = shouldLogHistory)
        }
    }

    fun setProductSort(field: ProductSortField) {
        if (_productSortField.value == field) {
            _productSortAscending.value = !_productSortAscending.value
        } else {
            _productSortField.value = field
            _productSortAscending.value = true
        }
    }

    fun deleteProductById(id: Int, onSuccess: () -> Unit) {
        viewModelScope.launch {
            repository.deleteProductById(id)
            onSuccess()
        }
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setSupermarketFilter(market: String) {
        _supermarketFilter.value = market
    }

    fun setStatusFilter(status: String) {
        _statusFilter.value = status
    }

    fun setHistoryProductFilter(product: String) {
        _historyProductFilter.value = product
    }

    fun setHistorySupermarketFilter(market: String) {
        _historySupermarketFilter.value = market
    }

    fun setHistoryMonthFilter(month: String) {
        _historyMonthFilter.value = month
    }

    fun setDashProductFilter(product: String?) {
        _dashProductFilter.value = product
    }

    fun setDashSupermarketFilter(market: String) {
        _dashSupermarketFilter.value = market
    }

    fun setDashMonthInterval(interval: Int) {
        _dashMonthInterval.value = interval
    }

    fun clearAuthMessages() {
        _authStateMessage.value = null
        _authSuccessMessage.value = null
    }
}

class MainViewModelFactory(private val repository: AppRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(MainViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return MainViewModel(repository) as T
        }
        throw IllegalArgumentException("Classe de ViewModel desconhecida")
    }
}
