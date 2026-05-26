package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.PriceHistory
import com.example.ui.MainViewModel
import com.example.ui.Screen
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(viewModel: MainViewModel) {
    val filteredHistory by viewModel.filteredPriceHistory.collectAsState()
    
    val existingProductNames by viewModel.existingProductNames.collectAsState()
    val historyMarkets by viewModel.historySupermarkets.collectAsState()
    val historyMonths by viewModel.historyMonths.collectAsState()

    val productFilter by viewModel.historyProductFilter.collectAsState()
    val marketFilter by viewModel.historySupermarketFilter.collectAsState()
    val monthFilter by viewModel.historyMonthFilter.collectAsState()

    val ptBrLocale = Locale("pt", "BR")
    val currencyFormatter = NumberFormat.getCurrencyInstance(ptBrLocale)
    val sdfFull = SimpleDateFormat("dd 'de' MMMM 'de' yyyy, HH:mm", ptBrLocale)

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Histórico de Preços",
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )
                },
                navigationIcon = {
                    IconButton(
                        onClick = { viewModel.navigateTo(Screen.ProductList) },
                        modifier = Modifier.testTag("history_back_button")
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
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
            // Filters Area
            Surface(
                color = MaterialTheme.colorScheme.surfaceContainerLow,
                tonalElevation = 1.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                         text = "Filtrar Registros",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )

                    // Product Filter Dropdown
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Product Dropdown Card
                        var prodExpanded by remember { mutableStateOf(false) }
                        Box(modifier = Modifier.weight(1.2f)) {
                            OutlinedCard(
                                onClick = { prodExpanded = true },
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
                                            "Produto",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                        Text(
                                            productFilter,
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
                                expanded = prodExpanded,
                                onDismissRequest = { prodExpanded = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Todos") },
                                    onClick = {
                                        viewModel.setHistoryProductFilter("Todos")
                                        prodExpanded = false
                                    }
                                )
                                existingProductNames.forEach { prodName ->
                                    DropdownMenuItem(
                                        text = { Text(prodName) },
                                        onClick = {
                                            viewModel.setHistoryProductFilter(prodName)
                                            prodExpanded = false
                                        }
                                    )
                                }
                            }
                        }

                        // Month Filter Dropdown
                        var monthExpanded by remember { mutableStateOf(false) }
                        Box(modifier = Modifier.weight(0.8f)) {
                            OutlinedCard(
                                onClick = { monthExpanded = true },
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
                                            "Mês / Ano",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                        Text(
                                            monthFilter,
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
                                expanded = monthExpanded,
                                onDismissRequest = { monthExpanded = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Todos") },
                                    onClick = {
                                        viewModel.setHistoryMonthFilter("Todos")
                                        monthExpanded = false
                                    }
                                )
                                historyMonths.forEach { monthName ->
                                    DropdownMenuItem(
                                        text = { Text(monthName) },
                                        onClick = {
                                            viewModel.setHistoryMonthFilter(monthName)
                                            monthExpanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    // Supermarket Filter Dropdown
                    var marketExpanded by remember { mutableStateOf(false) }
                    Box(modifier = Modifier.fillMaxWidth()) {
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
                                        "Supermercado",
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
                                    viewModel.setHistorySupermarketFilter("Todos")
                                    marketExpanded = false
                                }
                            )
                            historyMarkets.forEach { marketName ->
                                DropdownMenuItem(
                                    text = { Text(marketName) },
                                    onClick = {
                                        viewModel.setHistorySupermarketFilter(marketName)
                                        marketExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }
            }

            // History List content
            if (filteredHistory.isEmpty()) {
                EmptyHistoryState()
            } else {
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .testTag("history_list"),
                    contentPadding = PaddingValues(vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(
                        items = filteredHistory,
                        key = { it.id }
                    ) { record ->
                        HistoryRecordCard(
                            record = record,
                            formatCurrency = { currencyFormatter.format(it) },
                            formatDate = { sdfFull.format(Date(it)) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun HistoryRecordCard(
    record: PriceHistory,
    formatCurrency: (Double) -> String,
    formatDate: (Long) -> String
) {
    var expanded by remember { mutableStateOf(false) }
    val sdfShort = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())

    ElevatedCard(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.elevatedCardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = !expanded }
            .testTag("history_item_${record.id}")
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Leading decorative dollar bubble
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.TrendingUp,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                // Product details block
                Column(
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = record.productName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Storefront,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.outline,
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = record.supermarket ?: "Supermercado não informado",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.outline,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.width(8.dp))

                // Price and date block
                Column(
                    horizontalAlignment = Alignment.End
                ) {
                    Text(
                        text = formatCurrency(record.price),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = sdfShort.format(Date(record.timestamp)),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            }

            // Beautiful Expandable Details pane
            AnimatedVisibility(
                visible = expanded,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp)
                        .background(
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                            shape = RoundedCornerShape(8.dp)
                        )
                        .padding(12.dp)
                ) {
                    HorizontalDivider(modifier = Modifier.padding(bottom = 8.dp))
                    Text(
                        text = "DETALHES DO REGISTRO",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(bottom = 6.dp)
                    )
                    DetailRow(label = "Produto:", value = record.productName)
                    DetailRow(label = "Preço Lançado:", value = formatCurrency(record.price))
                    DetailRow(label = "Supermercado:", value = record.supermarket ?: "Não informado")
                    DetailRow(label = "Data & Hora Civil:", value = formatDate(record.timestamp))
                    DetailRow(label = "ID de Linha:", value = "#${record.id}")
                }
            }
        }
    }
}

@Composable
fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
fun EmptyHistoryState() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.History,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(36.dp)
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Nenhum histórico disponível",
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center
        )
        Text(
            text = "Quando você cadastrar ou atualizar os preços dos produtos no supermercado, os registros de preço serão salvos automaticamente para alimentar o dashboard.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 4.dp)
        )
    }
}
