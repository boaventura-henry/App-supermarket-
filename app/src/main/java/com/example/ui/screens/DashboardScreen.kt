package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.MainViewModel
import com.example.ui.Screen
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(viewModel: MainViewModel) {
    val priceHistory by viewModel.priceHistory.collectAsState()
    val existingProductNames by viewModel.existingProductNames.collectAsState()
    val historyMarkets by viewModel.historySupermarkets.collectAsState()

    val selectedProduct by viewModel.dashProductFilter.collectAsState()
    val selectedMarket by viewModel.dashSupermarketFilter.collectAsState()
    val selectedInterval by viewModel.dashMonthInterval.collectAsState()

    val ptBrLocale = Locale("pt", "BR")
    val currencyFormatter = NumberFormat.getCurrencyInstance(ptBrLocale)

    // Compute Timeline Monthly Coordinates
    val timelineData = remember(priceHistory, selectedProduct, selectedMarket, selectedInterval) {
        if (selectedProduct == null) return@remember emptyList<Pair<String, Double>>()

        val productLogs = priceHistory.filter { it.productName == selectedProduct }

        val sdfKey = SimpleDateFormat("MM/yyyy", Locale.getDefault())
        val sdfDisplay = SimpleDateFormat("MMM/yy", ptBrLocale)

        val tempTimeline = mutableListOf<Pair<String, Double>>()

        val cal = Calendar.getInstance()
        cal.add(Calendar.MONTH, -selectedInterval + 1)
        for (i in 0 until selectedInterval) {
            val key = sdfKey.format(cal.time)
            val display = sdfDisplay.format(cal.time).replaceFirstChar { it.uppercase() }

            val logsInMonth = productLogs.filter { log ->
                val logMonth = sdfKey.format(Date(log.timestamp))
                val matchesMarket = selectedMarket == "Todos" || log.supermarket == selectedMarket
                logMonth == key && matchesMarket
            }

            val avgPriceInMonth = if (logsInMonth.isNotEmpty()) {
                logsInMonth.map { it.price }.average()
            } else {
                0.0 // 0 means no logs
            }

            tempTimeline.add(Pair(display, avgPriceInMonth))
            cal.add(Calendar.MONTH, 1)
        }

        tempTimeline
    }

    // Compute Comparative analysis across markets (Bar Chart coordinates)
    val marketComparison = remember(priceHistory, selectedProduct, selectedInterval) {
        if (selectedProduct == null) return@remember emptyList<Pair<String, Double>>()

        // Filter product logs within historical period window
        val calLimit = Calendar.getInstance()
        calLimit.add(Calendar.MONTH, -selectedInterval)
        val limitTimestamp = calLimit.timeInMillis

        val productLogs = priceHistory.filter { 
            it.productName == selectedProduct && 
            it.timestamp >= limitTimestamp &&
            !it.supermarket.isNullOrBlank()
        }

        // Group by supermarket and find the LATEST logged price
        productLogs.groupBy { it.supermarket!! }.map { (market, logs) ->
            val latestLog = logs.maxByOrNull { it.timestamp }
            val price = latestLog?.price ?: 0.0
            Pair(market, price)
        }.filter { it.second > 0.0 }.sortedBy { it.second }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Dashboard Analítico",
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )
                },
                navigationIcon = {
                    IconButton(
                        onClick = { viewModel.navigateTo(Screen.ProductList) },
                        modifier = Modifier.testTag("dashboard_back_button")
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
            if (existingProductNames.isEmpty()) {
                EmptyDashboardState()
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Filter options panel
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainerLow
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Text(
                                "Análise Comparativa de Preços",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )

                            // Dropdown for target product
                            var prodExp by remember { mutableStateOf(false) }
                            Box(modifier = Modifier.fillMaxWidth()) {
                                OutlinedButton(
                                    onClick = { prodExp = true },
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(horizontalAlignment = Alignment.Start) {
                                            Text("Produto Selecionado", style = MaterialTheme.typography.labelSmall)
                                            Text(
                                                selectedProduct ?: "Selecione...",
                                                style = MaterialTheme.typography.bodyLarge,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onSurface,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                        Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                                    }
                                }
                                DropdownMenu(
                                    expanded = prodExp,
                                    onDismissRequest = { prodExp = false }
                                ) {
                                    existingProductNames.forEach { name ->
                                        DropdownMenuItem(
                                            text = { Text(name) },
                                            onClick = {
                                                viewModel.setDashProductFilter(name)
                                                prodExp = false
                                            }
                                        )
                                    }
                                }
                            }

                            // Secondary filters row
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                // Supermarket filter (optional)
                                var marketExp by remember { mutableStateOf(false) }
                                Box(modifier = Modifier.weight(1.1f)) {
                                    OutlinedButton(
                                        onClick = { marketExp = true },
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column {
                                                Text("Supermercado", style = MaterialTheme.typography.labelSmall)
                                                Text(
                                                    selectedMarket,
                                                    style = MaterialTheme.typography.bodyMedium,
                                                    fontWeight = FontWeight.Bold,
                                                    color = MaterialTheme.colorScheme.onSurface,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                            Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                        }
                                    }
                                    DropdownMenu(
                                        expanded = marketExp,
                                        onDismissRequest = { marketExp = false }
                                    ) {
                                        DropdownMenuItem(
                                            text = { Text("Todos") },
                                            onClick = {
                                                viewModel.setDashSupermarketFilter("Todos")
                                                marketExp = false
                                            }
                                        )
                                        historyMarkets.forEach { market ->
                                            DropdownMenuItem(
                                                text = { Text(market) },
                                                onClick = {
                                                    viewModel.setDashSupermarketFilter(market)
                                                    marketExp = false
                                                }
                                            )
                                        }
                                    }
                                }

                                // Timeline months interval selection
                                var intervalExp by remember { mutableStateOf(false) }
                                Box(modifier = Modifier.weight(0.9f)) {
                                    OutlinedButton(
                                        onClick = { intervalExp = true },
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column {
                                                Text("Intervalo", style = MaterialTheme.typography.labelSmall)
                                                Text(
                                                    "$selectedInterval Meses",
                                                    style = MaterialTheme.typography.bodyMedium,
                                                    fontWeight = FontWeight.Bold,
                                                    color = MaterialTheme.colorScheme.onSurface
                                                )
                                            }
                                            Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                        }
                                    }
                                    DropdownMenu(
                                        expanded = intervalExp,
                                        onDismissRequest = { intervalExp = false }
                                    ) {
                                        listOf(3, 6, 12).forEach { interval ->
                                            DropdownMenuItem(
                                                text = { Text("$interval Meses") },
                                                onClick = {
                                                    viewModel.setDashMonthInterval(interval)
                                                    intervalExp = false
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Card with general summary stats
                    if (selectedProduct != null) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            val activeTimelinePrices = timelineData.map { it.second }.filter { it > 0.0 }
                            val minVal = if (activeTimelinePrices.isNotEmpty()) activeTimelinePrices.minOrNull() ?: 0.0 else 0.0
                            val maxVal = if (activeTimelinePrices.isNotEmpty()) activeTimelinePrices.maxOrNull() ?: 0.0 else 0.0
                            val avgVal = if (activeTimelinePrices.isNotEmpty()) activeTimelinePrices.average() else 0.0

                            SummaryStatCard(
                                title = "Preço Mínimo",
                                value = currencyFormatter.format(minVal),
                                icon = Icons.Default.TrendingDown,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.weight(1f)
                            )
                            SummaryStatCard(
                                title = "Preço Máximo",
                                value = currencyFormatter.format(maxVal),
                                icon = Icons.Default.TrendingUp,
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.weight(1f)
                            )
                            SummaryStatCard(
                                title = "Média Período",
                                value = currencyFormatter.format(avgVal),
                                icon = Icons.Default.Percent,
                                tint = MaterialTheme.colorScheme.secondary,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // Chart 1: Monthly variation Canvas Line Chart
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surface
                        ),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp)
                        ) {
                            Text(
                                text = "Variação Mensal de Preço",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "Média mensal de R$ pelo produto \"$selectedProduct\"",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(bottom = 16.dp)
                            )

                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(180.dp)
                                    .padding(vertical = 4.dp)
                            ) {
                                val hasLogs = timelineData.any { it.second > 0.0 }
                                if (hasLogs) {
                                    val axisColor = MaterialTheme.colorScheme.outlineVariant
                                    val lineColor = MaterialTheme.colorScheme.primary
                                    val dotColor = MaterialTheme.colorScheme.secondary
                                    val gridColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)

                                    Canvas(modifier = Modifier.fillMaxSize()) {
                                        val width = size.width
                                        val height = size.height

                                        val validPoints = timelineData.map { it.second }
                                        val maxPrice = validPoints.maxOrNull() ?: 10.0
                                        val minPrice = 0.0 // lock floor line to R$ 0.0 for proportions

                                        val horizontalSteps = timelineData.size
                                        val xGap = width / (horizontalSteps - 1).coerceAtLeast(1)
                                        val range = (maxPrice - minPrice).coerceAtLeast(0.01)

                                        // Draw horizontal reference grid lines
                                        val gridRows = 4
                                        for (i in 0..gridRows) {
                                            val y = height * (i.toFloat() / gridRows)
                                            drawLine(
                                                color = gridColor,
                                                start = Offset(0f, y),
                                                end = Offset(width, y),
                                                strokeWidth = 1f
                                            )
                                        }

                                        // Formulate point coordinates
                                        val pts = timelineData.mapIndexed { index, pair ->
                                            val px = index * xGap
                                            val priceVal = pair.second
                                            // inverted Y coordinate since (0,0) is top-left
                                            val py = if (priceVal > 0.0) {
                                                height - ((priceVal - minPrice) / range * height).toFloat()
                                            } else {
                                                height // floor if no logs
                                            }
                                            Offset(px, py)
                                        }

                                        // Draw connection curves / path
                                        val path = Path()
                                        var firstPlotPoint = true
                                        pts.forEachIndexed { idx, point ->
                                            // only plot continuous lines for months containing registered logins
                                            if (timelineData[idx].second > 0.0) {
                                                if (firstPlotPoint) {
                                                    path.moveTo(point.x, point.y)
                                                    firstPlotPoint = false
                                                } else {
                                                    path.lineTo(point.x, point.y)
                                                }
                                            }
                                        }

                                        drawPath(
                                            path = path,
                                            color = lineColor,
                                            style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
                                        )

                                        // Draw peak points / dots
                                        pts.forEachIndexed { idx, point ->
                                            val price = timelineData[idx].second
                                            if (price > 0.0) {
                                                drawCircle(
                                                    color = dotColor,
                                                    radius = 5.dp.toPx(),
                                                    center = point
                                                )
                                                drawCircle(
                                                    color = Color.White,
                                                    radius = 2.dp.toPx(),
                                                    center = point
                                                )
                                            }
                                        }

                                        // Bottom axes text markers
                                    }
                                } else {
                                    Box(
                                        modifier = Modifier.fillMaxSize(),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            "Sem registros cadastrados para a linha do tempo neste intervalo",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.outline,
                                            textAlign = TextAlign.Center
                                        )
                                    }
                                }
                            }

                            // Timeline Horizontal Labels Row
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                timelineData.forEach { pair ->
                                    val col = if (pair.second > 0.0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(
                                            text = pair.first,
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                        if (pair.second > 0.0) {
                                            Text(
                                                text = "R$%.0f".format(pair.second),
                                                style = MaterialTheme.typography.labelSmall,
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = col
                                            )
                                        } else {
                                            Text(
                                                text = "-",
                                                style = MaterialTheme.typography.labelSmall,
                                                fontSize = 9.sp,
                                                color = col
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Chart 2: Comparative values across Supermarkets
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surface
                        ),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp)
                        ) {
                            Text(
                                text = "Comparativo Entre Supermercados",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "Último valor registrado de \"$selectedProduct\"",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(bottom = 16.dp)
                            )

                            if (marketComparison.isEmpty()) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(100.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        "Cadastre o supermercado no produto para gerar o comparativo.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.outline,
                                        textAlign = TextAlign.Center
                                    )
                                }
                            } else {
                                val maxMarketPrice = marketComparison.maxOfOrNull { it.second } ?: 1.0
                                val cheapestMarket = marketComparison.minBy { it.second }

                                Column(
                                    verticalArrangement = Arrangement.spacedBy(14.dp)
                                ) {
                                    marketComparison.forEach { (market, price) ->
                                        val isCheapest = cheapestMarket.first == market
                                        val progress = (price / maxMarketPrice).toFloat()

                                        Column {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Icon(
                                                        imageVector = Icons.Default.Storefront,
                                                        contentDescription = null,
                                                        tint = if (isCheapest) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                                                        modifier = Modifier.size(16.dp)
                                                    )
                                                    Spacer(modifier = Modifier.width(6.dp))
                                                    Text(
                                                        text = market,
                                                        style = MaterialTheme.typography.bodyMedium,
                                                        fontWeight = if (isCheapest) FontWeight.ExtraBold else FontWeight.Medium,
                                                        color = if (isCheapest) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                                                    )
                                                    if (isCheapest && marketComparison.size > 1) {
                                                        Spacer(modifier = Modifier.width(8.dp))
                                                        Box(
                                                            modifier = Modifier
                                                                .clip(RoundedCornerShape(4.dp))
                                                                .background(MaterialTheme.colorScheme.primaryContainer)
                                                                .padding(horizontal = 4.dp, vertical = 2.dp)
                                                        ) {
                                                            Text(
                                                                "MAIS BARATO",
                                                                style = MaterialTheme.typography.labelSmall,
                                                                fontSize = 8.sp,
                                                                fontWeight = FontWeight.Bold,
                                                                color = MaterialTheme.colorScheme.primary
                                                            )
                                                        }
                                                    }
                                                }
                                                Text(
                                                    text = currencyFormatter.format(price),
                                                    style = MaterialTheme.typography.bodyMedium,
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (isCheapest) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                                                )
                                            }
                                            Spacer(modifier = Modifier.height(4.dp))
                                            LinearProgressIndicator(
                                                progress = { progress },
                                                color = if (isCheapest) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondary.copy(alpha = 0.6f),
                                                trackColor = MaterialTheme.colorScheme.surfaceVariant,
                                                strokeCap = StrokeCap.Round,
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .height(8.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SummaryStatCard(
    title: String,
    value: String,
    icon: ImageVector,
    tint: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
        ),
        shape = RoundedCornerShape(10.dp)
    ) {
        Column(
            modifier = Modifier.padding(10.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = tint,
                    modifier = Modifier.size(14.dp)
                )
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = if (value == "R$ 0,00" || value.contains("0,00")) "-" else value,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun EmptyDashboardState() {
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
                imageVector = Icons.Default.BarChart,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(36.dp)
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Análise Indisponível",
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center
        )
        Text(
            text = "Cadastre itens de supermercado informando preço e quantidade na tela principal para gerar relatórios detalhados, variações de preço mensais e comparativos.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 4.dp)
        )
    }
}
