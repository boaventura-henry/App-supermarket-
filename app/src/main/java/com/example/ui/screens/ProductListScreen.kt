package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.Product
import com.example.ui.MainViewModel
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

    // Real-time calculation aggregates
    val totalListPrice = filteredProducts.sumOf { it.totalPrice }
    val boughtListPrice = filteredProducts.filter { it.isBought }.sumOf { it.totalPrice }

    val ptBrLocale = Locale("pt", "BR")
    val currencyFormatter = NumberFormat.getCurrencyInstance(ptBrLocale)

    // ModalNavigationDrawer provides standard sliding multi-user side menu
    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                modifier = Modifier.width(300.dp)
            ) {
                // Header of Drawer with user details
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
                            text = currentUser?.name ?: "Usuário",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                        Text(
                            text = currentUser?.email ?: "",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Navigation Items
                NavigationDrawerItem(
                    icon = { Icon(Icons.AutoMirrored.Filled.List, contentDescription = null) },
                    label = { Text("Lista de Compras") },
                    selected = true,
                    onClick = {
                        scope.launch { drawerState.close() }
                    },
                    modifier = Modifier.padding(horizontal = 12.dp)
                )

                NavigationDrawerItem(
                    icon = { Icon(Icons.Default.BarChart, contentDescription = null) },
                    label = { Text("Dashboard Analítico") },
                    selected = false,
                    onClick = {
                        scope.launch { drawerState.close() }
                        viewModel.navigateTo(Screen.Dashboard)
                    },
                    modifier = Modifier.padding(horizontal = 12.dp).testTag("nav_to_dashboard")
                )

                NavigationDrawerItem(
                    icon = { Icon(Icons.Default.History, contentDescription = null) },
                    label = { Text("Histórico de Preços") },
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
                    icon = { Icon(Icons.Default.Logout, contentDescription = null, tint = MaterialTheme.colorScheme.error) },
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
                            "Lista de Compras",
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
                        // Quick actions dropdown
                        var showDropdown by remember { mutableStateOf(false) }
                        IconButton(onClick = { showDropdown = true }) {
                            Icon(Icons.Default.MoreVert, contentDescription = "Mais opções")
                        }
                        DropdownMenu(
                            expanded = showDropdown,
                            onDismissRequest = { showDropdown = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Ver Dashboard") },
                                leadingIcon = { Icon(Icons.Default.BarChart, contentDescription = null) },
                                onClick = {
                                    showDropdown = false
                                    viewModel.navigateTo(Screen.Dashboard)
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Histórico de Preços") },
                                leadingIcon = { Icon(Icons.Default.History, contentDescription = null) },
                                onClick = {
                                    showDropdown = false
                                    viewModel.navigateTo(Screen.History)
                                }
                            )
                            HorizontalDivider()
                            DropdownMenuItem(
                                text = { Text("Fazer Logout", color = MaterialTheme.colorScheme.error) },
                                leadingIcon = { Icon(Icons.Default.Logout, contentDescription = null, tint = MaterialTheme.colorScheme.error) },
                                onClick = {
                                    showDropdown = false
                                    viewModel.logout()
                                }
                            )
                        }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainer
                    )
                )
            },
            floatingActionButton = {
                FloatingActionButton(
                    onClick = { viewModel.navigateTo(Screen.AddEditProduct(null)) },
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.testTag("add_product_fab")
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Cadastrar produto", modifier = Modifier.size(28.dp))
                }
            }
        ) { innerPadding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .background(MaterialTheme.colorScheme.background)
            ) {
                // Filters and search bar container
                Surface(
                    color = MaterialTheme.colorScheme.surfaceContainerLow,
                    tonalElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        // Search OutlinedTextField
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { viewModel.setSearchQuery(it) },
                            placeholder = { Text("Pesquisar produto ou marca...") },
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                            trailingIcon = {
                                if (searchQuery.isNotEmpty()) {
                                    IconButton(onClick = { viewModel.setSearchQuery("") }) {
                                        Icon(Icons.Default.Close, contentDescription = "Limpar pesquisa")
                                    }
                                }
                            },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("product_search_input")
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        // Filter selectors Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // Status Filter Dropdown Card
                            var statusExpanded by remember { mutableStateOf(false) }
                            Box(modifier = Modifier.weight(1f)) {
                                OutlinedCard(
                                    onClick = { statusExpanded = true },
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column {
                                            Text(
                                                "Status",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.primary
                                            )
                                            Text(
                                                statusFilter,
                                                style = MaterialTheme.typography.bodyMedium,
                                                fontWeight = FontWeight.Bold,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                        Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                    }
                                }
                                DropdownMenu(
                                    expanded = statusExpanded,
                                    onDismissRequest = { statusExpanded = false }
                                ) {
                                    listOf("Todos", "Comprados", "Não Comprados").forEach { statusName ->
                                        DropdownMenuItem(
                                            text = { Text(statusName) },
                                            onClick = {
                                                viewModel.setStatusFilter(statusName)
                                                statusExpanded = false
                                            }
                                        )
                                    }
                                }
                            }

                            // Supermarket Filter Dropdown Card
                            var marketExpanded by remember { mutableStateOf(false) }
                            Box(modifier = Modifier.weight(1f)) {
                                OutlinedCard(
                                    onClick = { marketExpanded = true },
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column {
                                            Text(
                                                "Mercado",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.primary
                                            )
                                            Text(
                                                marketFilter,
                                                style = MaterialTheme.typography.bodyMedium,
                                                fontWeight = FontWeight.Bold,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                        Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                    }
                                }
                                DropdownMenu(
                                    expanded = marketExpanded,
                                    onDismissRequest = { marketExpanded = false }
                                ) {
                                    DropdownMenuItem(
                                        text = { Text("Todos") },
                                        onClick = {
                                            viewModel.setSupermarketFilter("Todos")
                                            marketExpanded = false
                                        }
                                    )
                                    existingMarkets.forEach { marketName ->
                                        DropdownMenuItem(
                                            text = { Text(marketName) },
                                            onClick = {
                                                viewModel.setSupermarketFilter(marketName)
                                                marketExpanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Cumulative value banner at top of list
                Surface(
                    color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.6f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                "Total Geral",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                            Text(
                                currencyFormatter.format(totalListPrice),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                        }
                        VerticalDivider(modifier = Modifier.height(24.dp))
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                "Total Comprado",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Text(
                                currencyFormatter.format(boughtListPrice),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }

                // Checklist Content Section
                if (filteredProducts.isEmpty()) {
                    EmptyProductListState {
                        viewModel.navigateTo(Screen.AddEditProduct(null))
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        contentPadding = PaddingValues(vertical = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(
                            items = filteredProducts,
                            key = { it.id }
                        ) { product ->
                            ProductListItemCard(
                                product = product,
                                formatCurrency = { currencyFormatter.format(it) },
                                onCardClick = { viewModel.navigateTo(Screen.AddEditProduct(product.id)) },
                                onCheckStateChange = { viewModel.toggleProductBought(product) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ProductListItemCard(
    product: Product,
    formatCurrency: (Double) -> String,
    onCardClick: () -> Unit,
    onCheckStateChange: () -> Unit
) {
    // Opacity lower when bought, strike through text
    val itemAlpha = if (product.isBought) 0.55f else 1.0f

    ElevatedCard(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.elevatedCardColors(
            containerColor = if (product.isBought) 
                MaterialTheme.colorScheme.surfaceContainerLow 
            else 
                MaterialTheme.colorScheme.surface
        ),
        modifier = Modifier
            .fillMaxWidth()
            .testTag("product_item_${product.id}")
            .combinedClickable(
                onClick = onCardClick,
                onLongClick = onCardClick
            )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Interactive custom checkbox
            IconButton(
                onClick = onCheckStateChange,
                modifier = Modifier
                    .minimumInteractiveComponentSize()
                    .testTag("product_checkbox_${product.id}")
            ) {
                Icon(
                    imageVector = if (product.isBought) 
                        Icons.Default.CheckCircle 
                    else 
                        Icons.Default.RadioButtonUnchecked,
                    contentDescription = "Marcar produto comprado",
                    tint = if (product.isBought) 
                        MaterialTheme.colorScheme.primary 
                    else 
                        MaterialTheme.colorScheme.outline,
                    modifier = Modifier.size(26.dp)
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            // Text info container
            Column(
                modifier = Modifier
                    .weight(1f)
                    .align(Alignment.CenterVertically)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = product.name,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            textDecoration = if (product.isBought) TextDecoration.LineThrough else TextDecoration.None
                        ),
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = itemAlpha),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (product.brand.isNotBlank()) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "(${product.brand})",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = itemAlpha),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.height(3.dp))

                // Quantity and individual value description
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Badge-like visual for quantity
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(MaterialTheme.colorScheme.secondaryContainer.copy(alpha = itemAlpha))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        val isInteger = product.quantity % 1.0 == 0.0
                        val qtyText = if (isInteger) product.quantity.toInt().toString() else "%.2f".format(product.quantity)
                        Text(
                            text = "${qtyText}un",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = itemAlpha),
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Text(
                        text = "x ${formatCurrency(product.unitPrice)}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = itemAlpha)
                    )
                }

                if (!product.supermarket.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Storefront,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary.copy(alpha = itemAlpha),
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = product.supermarket,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.primary.copy(alpha = itemAlpha),
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Total price of this item row
            Column(
                horizontalAlignment = Alignment.End,
                modifier = Modifier.align(Alignment.CenterVertically)
            ) {
                Text(
                    text = "Subtotal",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline.copy(alpha = itemAlpha)
                )
                Text(
                    text = formatCurrency(product.totalPrice),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.primary.copy(alpha = itemAlpha)
                )
            }
        }
    }
}

@Composable
fun EmptyProductListState(onAddClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
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
            text = "Sua Lista Está Vazia",
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center
        )
        Text(
            text = "Cadastre itens de supermercado clicando no botão abaixo para preencher o seu carrinho de compras.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 6.dp, bottom = 20.dp)
        )
        Button(
            onClick = onAddClick,
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(Icons.Default.Add, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Adicionar Item")
        }
    }
}
