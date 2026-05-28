package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingBasket
import androidx.compose.material3.Button
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.VerticalDivider
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.data.model.Product
import com.example.ui.MainViewModel
import com.example.ui.ProductInputParser
import com.example.ui.ProductSortField
import com.example.ui.Screen
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductListScreen(viewModel: MainViewModel) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val currentUser by viewModel.currentUser.collectAsState()
    val filteredProducts by viewModel.filteredProducts.collectAsState()
    val existingMarkets by viewModel.existingSupermarkets.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val marketFilter by viewModel.supermarketFilter.collectAsState()
    val statusFilter by viewModel.statusFilter.collectAsState()
    val sortField by viewModel.productSortField.collectAsState()
    val sortAscending by viewModel.productSortAscending.collectAsState()

    val currencyFormatter = remember {
        NumberFormat.getCurrencyInstance(Locale("pt", "BR"))
    }
    val totalListPrice = filteredProducts.sumOf { it.totalPrice }
    val boughtListPrice = filteredProducts.filter { it.isBought }.sumOf { it.totalPrice }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(modifier = Modifier.width(300.dp)) {
                DrawerHeader(name = currentUser?.name ?: "Usuario", email = currentUser?.email.orEmpty())
                Spacer(modifier = Modifier.height(16.dp))
                NavigationDrawerItem(
                    icon = { Icon(Icons.AutoMirrored.Filled.List, contentDescription = null) },
                    label = { Text("Lista de Compras") },
                    selected = true,
                    onClick = { scope.launch { drawerState.close() } },
                    modifier = Modifier.padding(horizontal = 12.dp)
                )
                NavigationDrawerItem(
                    icon = { Icon(Icons.Default.BarChart, contentDescription = null) },
                    label = { Text("Dashboard Analitico") },
                    selected = false,
                    onClick = {
                        scope.launch { drawerState.close() }
                        viewModel.navigateTo(Screen.Dashboard)
                    },
                    modifier = Modifier.padding(horizontal = 12.dp).testTag("nav_to_dashboard")
                )
                NavigationDrawerItem(
                    icon = { Icon(Icons.Default.History, contentDescription = null) },
                    label = { Text("Historico de Precos") },
                    selected = false,
                    onClick = {
                        scope.launch { drawerState.close() }
                        viewModel.navigateTo(Screen.History)
                    },
                    modifier = Modifier.padding(horizontal = 12.dp).testTag("nav_to_history")
                )
                Spacer(modifier = Modifier.weight(1f))
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                NavigationDrawerItem(
                    icon = {
                        Icon(
                            Icons.Default.Logout,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error
                        )
                    },
                    label = { Text("Sair da Conta", color = MaterialTheme.colorScheme.error) },
                    selected = false,
                    onClick = {
                        scope.launch { drawerState.close() }
                        viewModel.logout()
                    },
                    modifier = Modifier.padding(horizontal = 12.dp).padding(bottom = 12.dp).testTag("nav_logout")
                )
            }
        }
    ) {
        Scaffold(
            topBar = {
                CenterAlignedTopAppBar(
                    title = {
                        Text(
                            "Compra do mes",
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    },
                    navigationIcon = {
                        IconButton(
                            onClick = { scope.launch { drawerState.open() } },
                            modifier = Modifier.testTag("drawer_open_button")
                        ) {
                            Icon(Icons.Default.Menu, contentDescription = "Menu lateral")
                        }
                    },
                    actions = {
                        ProductListOverflowMenu(viewModel)
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainer
                    )
                )
            }
        ) { innerPadding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .background(MaterialTheme.colorScheme.background)
            ) {
                QuickProductForm(viewModel = viewModel)
                ProductFilters(
                    searchQuery = searchQuery,
                    statusFilter = statusFilter,
                    marketFilter = marketFilter,
                    markets = existingMarkets,
                    onSearchChange = viewModel::setSearchQuery,
                    onStatusChange = viewModel::setStatusFilter,
                    onMarketChange = viewModel::setSupermarketFilter
                )
                ProductTotalBanner(
                    total = currencyFormatter.format(totalListPrice),
                    bought = currencyFormatter.format(boughtListPrice)
                )

                if (filteredProducts.isEmpty()) {
                    EmptyProductListState()
                } else {
                    val horizontalScrollState = rememberScrollState()
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 10.dp)
                            .horizontalScroll(horizontalScrollState)
                    ) {
                        LazyColumn(
                            modifier = Modifier.width(760.dp),
                            contentPadding = PaddingValues(bottom = 12.dp)
                        ) {
                            item {
                                ProductTableHeader(
                                    sortField = sortField,
                                    sortAscending = sortAscending,
                                    onSortClick = viewModel::setProductSort
                                )
                            }
                            items(items = filteredProducts, key = { it.id }) { product ->
                                ProductTableRow(
                                    product = product,
                                    formatCurrency = { currencyFormatter.format(it) },
                                    onQuantityChange = { viewModel.updateProductQuantity(product, it) },
                                    onUnitPriceChange = { viewModel.updateProductUnitPrice(product, it) },
                                    onCheckStateChange = { viewModel.toggleProductBought(product) },
                                    onEditClick = { viewModel.navigateTo(Screen.AddEditProduct(product.id)) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DrawerHeader(name: String, email: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.primary,
                        MaterialTheme.colorScheme.primaryContainer
                    )
                )
            )
            .padding(24.dp)
    ) {
        Column {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(32.dp)
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = name,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimary
            )
            Text(
                text = email,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun ProductListOverflowMenu(viewModel: MainViewModel) {
    var showDropdown by remember { mutableStateOf(false) }
    IconButton(onClick = { showDropdown = true }) {
        Icon(Icons.Default.MoreVert, contentDescription = "Mais opcoes")
    }
    DropdownMenu(expanded = showDropdown, onDismissRequest = { showDropdown = false }) {
        DropdownMenuItem(
            text = { Text("Ver Dashboard") },
            leadingIcon = { Icon(Icons.Default.BarChart, contentDescription = null) },
            onClick = {
                showDropdown = false
                viewModel.navigateTo(Screen.Dashboard)
            }
        )
        DropdownMenuItem(
            text = { Text("Historico de Precos") },
            leadingIcon = { Icon(Icons.Default.History, contentDescription = null) },
            onClick = {
                showDropdown = false
                viewModel.navigateTo(Screen.History)
            }
        )
        HorizontalDivider()
        DropdownMenuItem(
            text = { Text("Fazer Logout", color = MaterialTheme.colorScheme.error) },
            leadingIcon = {
                Icon(
                    Icons.Default.Logout,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error
                )
            },
            onClick = {
                showDropdown = false
                viewModel.logout()
            }
        )
    }
}

@Composable
private fun QuickProductForm(viewModel: MainViewModel) {
    var name by rememberSaveable { mutableStateOf("") }
    var quantity by rememberSaveable { mutableStateOf("") }
    var unitPrice by rememberSaveable { mutableStateOf("") }
    var supermarket by rememberSaveable { mutableStateOf("") }
    var error by rememberSaveable { mutableStateOf<String?>(null) }

    Surface(
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.Top
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = {
                        name = it
                        error = null
                    },
                    label = { Text("Nome do item *") },
                    singleLine = true,
                    isError = error != null && name.isBlank(),
                    modifier = Modifier.weight(1.4f).testTag("quick_product_name")
                )
                OutlinedTextField(
                    value = unitPrice,
                    onValueChange = {
                        unitPrice = it
                        error = null
                    },
                    label = { Text("R$") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(0.8f).testTag("quick_product_price")
                )
                OutlinedTextField(
                    value = quantity,
                    onValueChange = {
                        quantity = it
                        error = null
                    },
                    label = { Text("Qtd") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(0.7f).testTag("quick_product_quantity")
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = supermarket,
                    onValueChange = { supermarket = it },
                    label = { Text("Supermercado") },
                    singleLine = true,
                    modifier = Modifier.weight(1f).testTag("quick_product_market")
                )
                Button(
                    onClick = {
                        viewModel.saveQuickProduct(
                            name = name,
                            quantityStr = quantity,
                            unitPriceStr = unitPrice,
                            supermarket = supermarket,
                            onSuccess = {
                                name = ""
                                quantity = ""
                                unitPrice = ""
                                supermarket = ""
                                error = null
                            },
                            onError = { error = it }
                        )
                    },
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.height(56.dp).testTag("quick_product_save")
                ) {
                    Icon(Icons.Default.Save, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Salvar", fontWeight = FontWeight.Bold)
                }
            }
            if (error != null) {
                Text(
                    text = error.orEmpty(),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }
    }
}

@Composable
private fun ProductFilters(
    searchQuery: String,
    statusFilter: String,
    marketFilter: String,
    markets: List<String>,
    onSearchChange: (String) -> Unit,
    onStatusChange: (String) -> Unit,
    onMarketChange: (String) -> Unit
) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        tonalElevation = 1.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = onSearchChange,
                placeholder = { Text("Pesquisar produto ou marca...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { onSearchChange("") }) {
                            Icon(Icons.Default.Close, contentDescription = "Limpar pesquisa")
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().testTag("product_search_input")
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterDropdown(
                    title = "Status",
                    value = statusFilter,
                    options = listOf("Todos", "Comprados", "Nao Comprados"),
                    onChange = onStatusChange,
                    modifier = Modifier.weight(1f)
                )
                FilterDropdown(
                    title = "Mercado",
                    value = marketFilter,
                    options = listOf("Todos") + markets,
                    onChange = onMarketChange,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun FilterDropdown(
    title: String,
    value: String,
    options: List<String>,
    onChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier = modifier) {
        OutlinedCard(
            onClick = { expanded = true },
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                Text(title, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, maxLines = 1)
            }
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option) },
                    onClick = {
                        onChange(option)
                        expanded = false
                    }
                )
            }
        }
    }
}

@Composable
private fun ProductTotalBanner(total: String, bought: String) {
    Surface(
        color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.6f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text("Preco total da lista", style = MaterialTheme.typography.labelSmall)
                Text(total, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
            VerticalDivider(modifier = Modifier.height(28.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text("Preco atual", style = MaterialTheme.typography.labelSmall)
                Text(bought, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold)
            }
        }
    }
}

@Composable
private fun ProductTableHeader(
    sortField: ProductSortField,
    sortAscending: Boolean,
    onSortClick: (ProductSortField) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(42.dp)
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Spacer(modifier = Modifier.width(42.dp))
        HeaderSortButton(
            label = "Nome do item",
            field = ProductSortField.NAME,
            activeField = sortField,
            ascending = sortAscending,
            onSortClick = onSortClick,
            modifier = Modifier.width(220.dp)
        )
        HeaderSortButton(
            label = "Qtd",
            field = ProductSortField.QUANTITY,
            activeField = sortField,
            ascending = sortAscending,
            onSortClick = onSortClick,
            modifier = Modifier.width(86.dp)
        )
        HeaderCell("R$", modifier = Modifier.width(100.dp))
        HeaderCell("Supermercado", modifier = Modifier.width(150.dp))
        HeaderCell("Total", modifier = Modifier.width(116.dp))
        HeaderCell("", modifier = Modifier.width(40.dp))
    }
}

@Composable
private fun HeaderCell(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.ExtraBold,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = modifier.padding(horizontal = 4.dp)
    )
}

@Composable
private fun HeaderSortButton(
    label: String,
    field: ProductSortField,
    activeField: ProductSortField,
    ascending: Boolean,
    onSortClick: (ProductSortField) -> Unit,
    modifier: Modifier = Modifier
) {
    TextButton(onClick = { onSortClick(field) }, modifier = modifier) {
        Text(label, fontWeight = FontWeight.ExtraBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        if (activeField == field) {
            Spacer(modifier = Modifier.width(4.dp))
            Icon(
                imageVector = if (ascending) Icons.Default.ArrowUpward else Icons.Default.ArrowDownward,
                contentDescription = null,
                modifier = Modifier.size(14.dp)
            )
        }
    }
}

@Composable
private fun ProductTableRow(
    product: Product,
    formatCurrency: (Double) -> String,
    onQuantityChange: (String) -> Unit,
    onUnitPriceChange: (String) -> Unit,
    onCheckStateChange: () -> Unit,
    onEditClick: () -> Unit
) {
    var quantityText by rememberSaveable(product.id) {
        mutableStateOf(ProductInputParser.formatOptionalDecimal(product.quantity))
    }
    var unitPriceText by rememberSaveable(product.id) {
        mutableStateOf(ProductInputParser.formatOptionalDecimal(product.unitPrice))
    }
    val rowColor = if (product.isBought) {
        MaterialTheme.colorScheme.surfaceContainerLow
    } else {
        MaterialTheme.colorScheme.surface
    }
    val contentAlpha = if (product.isBought) 0.56f else 1f

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(46.dp)
            .background(rowColor)
            .padding(horizontal = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(
            onClick = onCheckStateChange,
            modifier = Modifier.width(42.dp).testTag("product_checkbox_${product.id}")
        ) {
            Icon(
                imageVector = if (product.isBought) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                contentDescription = "Marcar comprado",
                tint = if (product.isBought) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
            )
        }
        Text(
            text = product.name,
            style = MaterialTheme.typography.bodyMedium.copy(
                fontWeight = FontWeight.Bold,
                textDecoration = if (product.isBought) TextDecoration.LineThrough else TextDecoration.None
            ),
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = contentAlpha),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.width(220.dp).padding(horizontal = 4.dp)
        )
        CompactNumberField(
            value = quantityText,
            onValueChange = {
                quantityText = it
                onQuantityChange(it)
            },
            modifier = Modifier.width(86.dp).testTag("product_quantity_${product.id}")
        )
        CompactNumberField(
            value = unitPriceText,
            onValueChange = {
                unitPriceText = it
                onUnitPriceChange(it)
            },
            modifier = Modifier.width(100.dp).testTag("product_price_${product.id}")
        )
        Text(
            text = product.supermarket.orEmpty().ifBlank { "-" },
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = contentAlpha),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.width(150.dp).padding(horizontal = 6.dp)
        )
        Text(
            text = formatCurrency(product.totalPrice),
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary.copy(alpha = contentAlpha),
            maxLines = 1,
            modifier = Modifier.width(116.dp).padding(horizontal = 4.dp)
        )
        IconButton(onClick = onEditClick, modifier = Modifier.width(40.dp)) {
            Icon(Icons.Default.Edit, contentDescription = "Editar produto", modifier = Modifier.size(18.dp))
        }
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
}

@Composable
private fun CompactNumberField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = true,
        textStyle = MaterialTheme.typography.bodySmall,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        isError = ProductInputParser.parseOptionalNonNegativeDecimal(value) == null,
        modifier = modifier.height(38.dp)
    )
}

@Composable
fun EmptyProductListState(onAddClick: (() -> Unit)? = null) {
    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(96.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.ShoppingBasket,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(48.dp)
            )
        }
        Spacer(modifier = Modifier.height(20.dp))
        Text(
            text = "Sua lista esta vazia",
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center
        )
        Text(
            text = "Cadastre o primeiro produto no formulario acima.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 6.dp, bottom = 20.dp)
        )
        if (onAddClick != null) {
            Button(onClick = onAddClick, shape = RoundedCornerShape(12.dp)) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Adicionar Item")
            }
        }
    }
}
