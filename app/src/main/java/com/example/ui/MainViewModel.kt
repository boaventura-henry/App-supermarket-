package com.example.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.data.model.PriceHistory
import com.example.data.model.Product
import com.example.data.model.User
import com.example.data.repository.AppRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

sealed class Screen {
    data object Login : Screen()
    data object SignUp : Screen()
    data object ForgotPassword : Screen()
    data object ProductList : Screen()
    data class AddEditProduct(val productId: Int? = null) : Screen()
    data object Dashboard : Screen()
    data object History : Screen()
}

class MainViewModel(private val repository: AppRepository) : ViewModel() {

    // Global navigation & auth state
    private val _currentScreen = MutableStateFlow<Screen>(Screen.Login)
    val currentScreen: StateFlow<Screen> = _currentScreen.asStateFlow()

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    // Feedback states (For signup, login, password recovery feedback to user)
    private val _authStateMessage = MutableStateFlow<String?>(null)
    val authStateMessage: StateFlow<String?> = _authStateMessage.asStateFlow()

    private val _authSuccessMessage = MutableStateFlow<String?>(null)
    val authSuccessMessage: StateFlow<String?> = _authSuccessMessage.asStateFlow()

    // Loaded live data (Subscribes dynamically to the logged-in user's data)
    @OptIn(ExperimentalCoroutinesApi::class)
    val products: StateFlow<List<Product>> = _currentUser
        .flatMapLatest { user ->
            if (user == null) flowOf(emptyList())
            else repository.getAllProducts(user.email)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    @OptIn(ExperimentalCoroutinesApi::class)
    val priceHistory: StateFlow<List<PriceHistory>> = _currentUser
        .flatMapLatest { user ->
            if (user == null) flowOf(emptyList())
            else repository.getPriceHistory(user.email)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // UI state for Product List Filters
    private val _searchQuery = MutableStateFlow("")
    val searchQuery = _searchQuery.asStateFlow()

    private val _supermarketFilter = MutableStateFlow("Todos")
    val supermarketFilter = _supermarketFilter.asStateFlow()

    private val _statusFilter = MutableStateFlow("Todos") // "Todos", "Comprados", "Não Comprados"
    val statusFilter = _statusFilter.asStateFlow()

    // Combine filters on products
    val filteredProducts: StateFlow<List<Product>> = combine(
        products, searchQuery, supermarketFilter, statusFilter
    ) { list, query, market, status ->
        list.filter { prod ->
            val matchesQuery = prod.name.contains(query, ignoreCase = true) || 
                               prod.brand.contains(query, ignoreCase = true)
            val matchesMarket = market == "Todos" || prod.supermarket == market
            val matchesStatus = when (status) {
                "Comprados" -> prod.isBought
                "Não Comprados" -> !prod.isBought
                else -> true
            }
            matchesQuery && matchesMarket && matchesStatus
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Unique supermarkets for dropdown filters
    val existingSupermarkets: StateFlow<List<String>> = products.map { list ->
        list.mapNotNull { it.supermarket }.filter { it.isNotBlank() }.distinct().sorted()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Unique product names for price history/dashboard selection
    val existingProductNames: StateFlow<List<String>> = priceHistory.map { list ->
        list.map { it.productName }.distinct().sorted()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Unique supermarkets in price history
    val historySupermarkets: StateFlow<List<String>> = priceHistory.map { list ->
        list.mapNotNull { it.supermarket }.filter { it.isNotBlank() }.distinct().sorted()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // UI state for Price History Filters
    private val _historyProductFilter = MutableStateFlow("Todos")
    val historyProductFilter = _historyProductFilter.asStateFlow()

    private val _historySupermarketFilter = MutableStateFlow("Todos")
    val historySupermarketFilter = _historySupermarketFilter.asStateFlow()

    private val _historyMonthFilter = MutableStateFlow("Todos") // "Todos", other options dynamically loaded
    val historyMonthFilter = _historyMonthFilter.asStateFlow()

    // Filtered Price History
    val filteredPriceHistory: StateFlow<List<PriceHistory>> = combine(
        priceHistory, historyProductFilter, historySupermarketFilter, historyMonthFilter
    ) { list, prod, market, month ->
        list.filter { history ->
            val matchesProd = prod == "Todos" || history.productName == prod
            val matchesMarket = market == "Todos" || history.supermarket == market
            
            val sdf = SimpleDateFormat("MM/yyyy", Locale.getDefault())
            val entryMonthStr = sdf.format(Date(history.timestamp))
            val matchesMonth = month == "Todos" || entryMonthStr == month
            
            matchesProd && matchesMarket && matchesMonth
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // History Months list
    val historyMonths: StateFlow<List<String>> = priceHistory.map { list ->
        val sdf = SimpleDateFormat("MM/yyyy", Locale.getDefault())
        list.map { sdf.format(Date(it.timestamp)) }.distinct()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // UI state for Dashboard Analytics Filters
    private val _dashProductFilter = MutableStateFlow<String?>(null)
    val dashProductFilter = _dashProductFilter.asStateFlow()

    private val _dashSupermarketFilter = MutableStateFlow("Todos")
    val dashSupermarketFilter = _dashSupermarketFilter.asStateFlow()

    private val _dashMonthInterval = MutableStateFlow(6) // default: last 6 months
    val dashMonthInterval = _dashMonthInterval.asStateFlow()

    init {
        // Automatically select the first product in the dashboard once products exist
        viewModelScope.launch {
            existingProductNames.collect { names ->
                if (_dashProductFilter.value == null && names.isNotEmpty()) {
                    _dashProductFilter.value = names.first()
                }
            }
        }
    }

    // Navigation trigger methods
    fun navigateTo(screen: Screen) {
        _currentScreen.value = screen
    }

    // Auth methods
    fun register(email: String, name: String, passHex: String, securityAnswer: String) {
        viewModelScope.launch {
            _authStateMessage.value = null
            _authSuccessMessage.value = null
            
            if (email.isBlank() || name.isBlank() || passHex.isBlank() || securityAnswer.isBlank()) {
                _authStateMessage.value = "Todos os campos são obrigatórios!"
                return@launch
            }
            if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                _authStateMessage.value = "Formato de e-mail inválido!"
                return@launch
            }
            if (passHex.length < 6) {
                _authStateMessage.value = "A senha deve conter no mínimo 6 caracteres!"
                return@launch
            }

            val existingUser = repository.getUserByEmail(email.lowercase().trim())
            if (existingUser != null) {
                _authStateMessage.value = "Este e-mail já está cadastrado!"
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
                _authSuccessMessage.value = "Conta criada com sucesso! Faça login."
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
                _authStateMessage.value = "E-mail e senha são obrigatórios!"
                return@launch
            }

            val user = repository.getUserByEmail(email.lowercase().trim())
            if (user == null || user.passwordPlain != passHex) {
                _authStateMessage.value = "E-mail ou senha incorretos!"
                return@launch
            }

            // Success
            _currentUser.value = user
            _currentScreen.value = Screen.ProductList
            
            // Clear filtering options
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
                _authStateMessage.value = "Preencha o e-mail e a resposta de segurança!"
                return@launch
            }

            val user = repository.getUserByEmail(email.lowercase().trim())
            if (user == null) {
                _authStateMessage.value = "E-mail não encontrado no sistema!"
                return@launch
            }

            if (user.securityAnswer.lowercase().trim() == securityAnswer.lowercase().trim()) {
                onRecovered(user.passwordPlain)
                _authSuccessMessage.value = "Recuperada! Sua senha é: ${user.passwordPlain}"
            } else {
                _authStateMessage.value = "Resposta de segurança incorreta!"
            }
        }
    }

    fun logout() {
        _currentUser.value = null
        _currentScreen.value = Screen.Login
        _authStateMessage.value = null
        _authSuccessMessage.value = null
    }

    // Product persistence and actions
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
                _authStateMessage.value = "Nenhum usuário logado!"
                return@launch
            }

            if (name.isBlank()) {
                _authStateMessage.value = "Nome do produto é obrigatório!"
                return@launch
            }

            val quantity = quantityStr.replace(",", ".").toDoubleOrNull() ?: 1.0
            if (quantity <= 0.0) {
                _authStateMessage.value = "A quantidade deve ser maior que zero!"
                return@launch
            }

            val unitPrice = unitPriceStr.replace(",", ".").toDoubleOrNull() ?: 0.0
            if (unitPrice <= 0.0) {
                _authStateMessage.value = "O preço unitário deve ser maior que zero!"
                return@launch
            }

            val formattedSupermarket = supermarket?.trim()?.ifBlank { null }

            if (id == 0) {
                // New product
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
                // Edit existing product
                val oldProduct = repository.getProductById(id)
                if (oldProduct != null) {
                    val isPriceOrMarketChanged = oldProduct.unitPrice != unitPrice || oldProduct.supermarket != formattedSupermarket
                    val updatedProduct = oldProduct.copy(
                        name = name.trim(),
                        brand = brand.trim(),
                        quantity = quantity,
                        unitPrice = unitPrice,
                        supermarket = formattedSupermarket
                    )
                    repository.updateProduct(updatedProduct, logHistory = isPriceOrMarketChanged)
                }
            }

            // Selection defaults update if it is the first product
            if (_dashProductFilter.value == null) {
                _dashProductFilter.value = name.trim()
            }

            onSuccess()
        }
    }

    fun deleteProductById(id: Int, onSuccess: () -> Unit) {
        viewModelScope.launch {
            repository.deleteProductById(id)
            onSuccess()
        }
    }

    // Update filter setter functions
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
