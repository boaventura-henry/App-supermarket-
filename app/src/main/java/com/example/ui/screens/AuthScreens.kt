package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.MainViewModel
import com.example.ui.Screen

@Composable
fun AuthHeader() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            MaterialTheme.colorScheme.primaryContainer,
                            MaterialTheme.colorScheme.primary
                        )
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.ShoppingCart,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier.size(38.dp)
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "SuperList",
            style = MaterialTheme.typography.headlineLarge.copy(
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 1.sp
            ),
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "Suas compras sob controle",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun LoginScreen(viewModel: MainViewModel) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    val authStateMsg by viewModel.authStateMessage.collectAsState()
    val authSuccessMsg by viewModel.authSuccessMessage.collectAsState()

    val scrollState = rememberScrollState()

    LaunchedEffect(Unit) {
        viewModel.clearAuthMessages()
    }

    Scaffold(
        modifier = Modifier.fillMaxSize().navigationBarsPadding()
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            AuthHeader()
            
            Text(
                text = "Entrar no aplicativo",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Dynamic Error State Banner
            AnimatedVisibility(
                visible = authStateMsg != null,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                authStateMsg?.let { msg ->
                    Surface(
                        color = MaterialTheme.colorScheme.errorContainer,
                        tonalElevation = 2.dp,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Error,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = msg,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onErrorContainer
                            )
                        }
                    }
                }
            }

            // Dynamic Success State Banner
            AnimatedVisibility(
                visible = authSuccessMsg != null,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                authSuccessMsg?.let { msg ->
                    Surface(
                        color = MaterialTheme.colorScheme.secondaryContainer,
                        tonalElevation = 2.dp,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = msg,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                        }
                    }
                }
            }

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("E-mail") },
                placeholder = { Text("seu_email@provedor.com") },
                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
                    .testTag("login_email_input")
            )

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Senha") },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                trailingIcon = {
                    val icon = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(icon, contentDescription = "Alternar visibilidade da senha")
                    }
                },
                singleLine = true,
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 20.dp)
                    .testTag("login_password_input")
            )

            Button(
                onClick = { viewModel.login(email, password) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("login_submit_button"),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(
                    text = "Acessar o App",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Criar conta",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                        textDecoration = TextDecoration.Underline
                    ),
                    modifier = Modifier
                        .clickable { viewModel.navigateTo(Screen.SignUp) }
                        .padding(8.dp)
                        .testTag("goto_signup_button")
                )

                Text(
                    text = "Esqueci minha senha",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = MaterialTheme.colorScheme.secondary,
                        fontWeight = FontWeight.Bold,
                        textDecoration = TextDecoration.Underline
                    ),
                    modifier = Modifier
                        .clickable { viewModel.navigateTo(Screen.ForgotPassword) }
                        .padding(8.dp)
                        .testTag("goto_forgot_password_button")
                )
            }
        }
    }
}

@Composable
fun SignUpScreen(viewModel: MainViewModel) {
    var email by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var securityAnswer by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    val authStateMsg by viewModel.authStateMessage.collectAsState()
    val scrollState = rememberScrollState()

    LaunchedEffect(Unit) {
        viewModel.clearAuthMessages()
    }

    Scaffold(
        modifier = Modifier.fillMaxSize().navigationBarsPadding()
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            AuthHeader()

            Text(
                text = "Criar nova conta",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            AnimatedVisibility(
                visible = authStateMsg != null,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                authStateMsg?.let { msg ->
                    Surface(
                        color = MaterialTheme.colorScheme.errorContainer,
                        tonalElevation = 2.dp,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Error,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = msg,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onErrorContainer
                            )
                        }
                    }
                }
            }

            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Nome completo") },
                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
                    .testTag("signup_name_input")
            )

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("E-mail") },
                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
                    .testTag("signup_email_input")
            )

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Senha (mínimo 6 dígitos)") },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                trailingIcon = {
                    val icon = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(icon, contentDescription = null)
                    }
                },
                singleLine = true,
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
                    .testTag("signup_password_input")
            )

            OutlinedTextField(
                value = securityAnswer,
                onValueChange = { securityAnswer = it },
                label = { Text("Pergunta de segurança: Qual sua comida favorita?") },
                placeholder = { Text("Ex: Lasanha") },
                leadingIcon = { Icon(Icons.Default.Help, contentDescription = null) },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 20.dp)
                    .testTag("signup_security_input")
            )

            Button(
                onClick = { viewModel.register(email, name, password, securityAnswer) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("signup_submit_button"),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(
                    text = "Confirmar Cadastro",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "Já possui uma conta? Entrar",
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    textDecoration = TextDecoration.Underline
                ),
                modifier = Modifier
                    .clickable { viewModel.navigateTo(Screen.Login) }
                    .padding(8.dp)
                    .testTag("goto_login_button")
            )
        }
    }
}

@Composable
fun ForgotPasswordScreen(viewModel: MainViewModel) {
    var email by remember { mutableStateOf("") }
    var securityAnswer by remember { mutableStateOf("") }
    var recoveredPassword by remember { mutableStateOf<String?>(null) }

    val authStateMsg by viewModel.authStateMessage.collectAsState()
    val scrollState = rememberScrollState()

    LaunchedEffect(Unit) {
        viewModel.clearAuthMessages()
    }

    Scaffold(
        modifier = Modifier.fillMaxSize().navigationBarsPadding()
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            AuthHeader()

            Text(
                text = "Recuperar senha",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Text(
                text = "Responda à pergunta de segurança para obter sua senha correspondente.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            AnimatedVisibility(
                visible = authStateMsg != null,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                authStateMsg?.let { msg ->
                    Surface(
                        color = MaterialTheme.colorScheme.errorContainer,
                        tonalElevation = 2.dp,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Error,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = msg,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onErrorContainer
                            )
                        }
                    }
                }
            }

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Digite o e-mail cadastrado") },
                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
                    .testTag("recover_email_input")
            )

            OutlinedTextField(
                value = securityAnswer,
                onValueChange = { securityAnswer = it },
                label = { Text("Qual sua comida favorita?") },
                leadingIcon = { Icon(Icons.Default.Help, contentDescription = null) },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 20.dp)
                    .testTag("recover_security_input")
            )

            Button(
                onClick = {
                    viewModel.recoverPassword(email, securityAnswer) { password ->
                        recoveredPassword = password
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("recover_submit_button"),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(
                    text = "Verificar Resposta",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                )
            }

            AnimatedVisibility(
                visible = recoveredPassword != null,
                enter = fadeIn() + expandVertically()
            ) {
                recoveredPassword?.let { pass ->
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.secondaryContainer
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 16.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "Sua senha é:",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = pass,
                                style = MaterialTheme.typography.headlineMedium.copy(
                                    fontWeight = FontWeight.ExtraBold,
                                    letterSpacing = 2.sp
                                ),
                                color = MaterialTheme.colorScheme.secondary
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Voltar para o Login",
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    textDecoration = TextDecoration.Underline
                ),
                modifier = Modifier
                    .clickable { viewModel.navigateTo(Screen.Login) }
                    .padding(8.dp)
                    .testTag("goto_login_from_recover_button")
            )
        }
    }
}
