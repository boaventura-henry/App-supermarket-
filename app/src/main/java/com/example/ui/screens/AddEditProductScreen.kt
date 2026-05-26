package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.MainViewModel
import com.example.ui.Screen
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEditProductScreen(productId: Int?, viewModel: MainViewModel) {
    var name by remember { mutableStateOf("") }
    var brand by remember { mutableStateOf("") }
    var quantityStr by remember { mutableStateOf("1") }
    var unitPriceStr by remember { mutableStateOf("") }
    var supermarket by remember { mutableStateOf("") }
    
    var isEditMode by remember { mutableStateOf(false) }
    var autoLaunchDateStr by remember { mutableStateOf("") }
    var showDeleteDialog by remember { mutableStateOf(false) }

    // Validation warning state
    var validationErrorMsg by remember { mutableStateOf<String?>(null) }

    val productsList by viewModel.products.collectAsState()

    // Load active dimensions if in EDIT Mode
    LaunchedEffect(productId, productsList) {
        if (productId != null) {
            isEditMode = true
            val product = productsList.firstOrNull { it.id == productId }
            if (product != null) {
                name = product.name
                brand = product.brand
                quantityStr = if (product.quantity % 1.0 == 0.0) product.quantity.toInt().toString() else product.quantity.toString()
                unitPriceStr = product.unitPrice.toString()
                supermarket = product.supermarket ?: ""
                
                val sdf = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
                autoLaunchDateStr = sdf.format(Date(product.timestamp))
            }
        } else {
            isEditMode = false
            val sdf = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
            autoLaunchDateStr = sdf.format(Date()) // automatic current timestamp
        }
    }

    // Function to perform validation is strictly required under 1.2 and 2.3
    val onSaveAction = {
        validationErrorMsg = null
        if (name.isBlank()) {
            validationErrorMsg = "O nome do produto é obrigatório!"
        } else {
            val qtyVal = quantityStr.replace(",", ".").toDoubleOrNull()
            val priceVal = unitPriceStr.replace(",", ".").toDoubleOrNull()

            if (qtyVal == null || qtyVal <= 0.0) {
                validationErrorMsg = "A quantidade deve ser um valor numérico maior que zero!"
            } else if (priceVal == null || priceVal <= 0.0) {
                validationErrorMsg = "O valor unitário deve ser um valor numérico maior que zero!"
            } else {
                viewModel.saveProduct(
                    id = productId ?: 0,
                    name = name,
                    brand = brand,
                    quantityStr = quantityStr,
                    unitPriceStr = unitPriceStr,
                    supermarket = supermarket,
                    onSuccess = {
                        viewModel.navigateTo(Screen.ProductList)
                    }
                )
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (isEditMode) "Editar Produto" else "Cadastrar Produto",
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )
                },
                navigationIcon = {
                    IconButton(
                        onClick = { viewModel.navigateTo(Screen.ProductList) },
                        modifier = Modifier.testTag("back_button")
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar")
                    }
                },
                actions = {
                    if (isEditMode) {
                        IconButton(
                            onClick = { showDeleteDialog = true },
                            modifier = Modifier.testTag("delete_product_button")
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = "Excluir Produto", tint = MaterialTheme.colorScheme.error)
                        }
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
                .verticalScroll(rememberScrollState())
                .padding(20.dp)
        ) {
            Text(
                text = "Preencha os dados do item",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Validation warning box
            AnimatedVisibility(
                visible = validationErrorMsg != null,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                validationErrorMsg?.let { errorText ->
                    Surface(
                        color = MaterialTheme.colorScheme.errorContainer,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 16.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = errorText,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onErrorContainer
                            )
                        }
                    }
                }
            }

            // Automatic date launch visual
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                ),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.CalendarToday,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Data de lançamento automática: $autoLaunchDateStr",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            // Form inputs
            OutlinedTextField(
                value = name,
                onValueChange = { name = it; validationErrorMsg = null },
                label = { Text("Nome do Produto *") },
                placeholder = { Text("Ex: Arroz, Leite Integral, Sabão...") },
                leadingIcon = { Icon(Icons.Default.ShoppingBag, contentDescription = null) },
                singleLine = true,
                isError = validationErrorMsg != null && name.isBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
                    .testTag("product_input_name")
            )

            OutlinedTextField(
                value = brand,
                onValueChange = { brand = it },
                label = { Text("Marca / Fabricante") },
                placeholder = { Text("Ex: Tio João, Nestlé, Omo (opcional)") },
                leadingIcon = { Icon(Icons.Default.Style, contentDescription = null) },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
                    .testTag("product_input_brand")
            )

            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = quantityStr,
                    onValueChange = { quantityStr = it; validationErrorMsg = null },
                    label = { Text("Quantidade *") },
                    placeholder = { Text("Ex: 1 ou 1.5") },
                    leadingIcon = { Icon(Icons.Default.ProductionQuantityLimits, contentDescription = null) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier
                        .weight(1f)
                        .testTag("product_input_quantity")
                )

                OutlinedTextField(
                    value = unitPriceStr,
                    onValueChange = { unitPriceStr = it; validationErrorMsg = null },
                    label = { Text("Preço Unitário (R$) *") },
                    placeholder = { Text("Ex: 5.99") },
                    leadingIcon = { Icon(Icons.Default.AttachMoney, contentDescription = null) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier
                        .weight(1.2f)
                        .testTag("product_input_price")
                )
            }

            OutlinedTextField(
                value = supermarket,
                onValueChange = { supermarket = it },
                label = { Text("Nome do Supermercado") },
                placeholder = { Text("Ex: Carrefour, Pão de Açúcar (opcional)") },
                leadingIcon = { Icon(Icons.Default.Storefront, contentDescription = null) },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 24.dp)
                    .testTag("product_input_market")
            )

            // Subtotal Calculation preview for UX delight
            val calculatedSubtotal = remember(quantityStr, unitPriceStr) {
                val q = quantityStr.replace(",", ".").toDoubleOrNull() ?: 0.0
                val p = unitPriceStr.replace(",", ".").toDoubleOrNull() ?: 0.0
                q * p
            }
            if (calculatedSubtotal > 0.0) {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                    ),
                    modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Previsão de Subtotal:",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Text(
                            text = "R$ %.2f".format(Locale.getDefault(), calculatedSubtotal),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            // Save actions
            Button(
                onClick = onSaveAction,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("product_save_button")
            ) {
                Icon(Icons.Default.Save, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    if (isEditMode) "Atualizar Dados" else "Salvar Item",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                )
            }

            if (isEditMode) {
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedButton(
                    onClick = { showDeleteDialog = true },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .testTag("product_delete_sec_button")
                ) {
                    Icon(Icons.Default.Delete, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Excluir Item do Carrinho", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }

    // Delete confirmation dialog
    if (showDeleteDialog && productId != null) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Confirmar Exclusão") },
            text = { Text("Tem certeza que deseja excluir o item \"$name\" da sua lista de compras? Esta ação é irreversível.") },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteDialog = false
                        viewModel.deleteProductById(productId) {
                            viewModel.navigateTo(Screen.ProductList)
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    modifier = Modifier.testTag("confirm_delete_btn")
                ) {
                    Text("Excluir", color = MaterialTheme.colorScheme.onError)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showDeleteDialog = false },
                    modifier = Modifier.testTag("cancel_delete_btn")
                ) {
                    Text("Cancelar")
                }
            }
        )
    }
}
