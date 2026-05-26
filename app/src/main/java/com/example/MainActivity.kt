package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.data.database.AppDatabase
import com.example.data.repository.AppRepository
import com.example.ui.MainViewModel
import com.example.ui.MainViewModelFactory
import com.example.ui.Screen
import com.example.ui.screens.AddEditProductScreen
import com.example.ui.screens.DashboardScreen
import com.example.ui.screens.ForgotPasswordScreen
import com.example.ui.screens.HistoryScreen
import com.example.ui.screens.LoginScreen
import com.example.ui.screens.ProductListScreen
import com.example.ui.screens.SignUpScreen
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Enable Edge-to-Edge display (mandatory under framework safe drawing guidelines)
        enableEdgeToEdge()

        // Local SQLite Room instance setup
        val database = AppDatabase.getDatabase(applicationContext)
        val repository = AppRepository(
            userDao = database.userDao(),
            productDao = database.productDao(),
            priceHistoryDao = database.priceHistoryDao()
        )
        val viewModelFactory = MainViewModelFactory(repository)

        setContent {
            MyApplicationTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val viewModel: MainViewModel = viewModel(factory = viewModelFactory)
                    AppNavigationHost(viewModel = viewModel)
                }
            }
        }
    }
}

@Composable
fun AppNavigationHost(viewModel: MainViewModel) {
    val currentScreen by viewModel.currentScreen.collectAsState()

    // Android Hardware Back Button click handling for custom Compose router
    BackHandler(enabled = currentScreen !is Screen.Login && currentScreen !is Screen.ProductList) {
        when (currentScreen) {
            is Screen.SignUp, is Screen.ForgotPassword -> viewModel.navigateTo(Screen.Login)
            is Screen.AddEditProduct, is Screen.Dashboard, is Screen.History -> viewModel.navigateTo(Screen.ProductList)
            else -> { /* no-op */ }
        }
    }

    // Smooth UI transitions across screens
    Crossfade(
        targetState = currentScreen,
        label = "AppScreenTransitions"
    ) { screen ->
        when (screen) {
            is Screen.Login -> LoginScreen(viewModel = viewModel)
            is Screen.SignUp -> SignUpScreen(viewModel = viewModel)
            is Screen.ForgotPassword -> ForgotPasswordScreen(viewModel = viewModel)
            is Screen.ProductList -> ProductListScreen(viewModel = viewModel)
            is Screen.AddEditProduct -> AddEditProductScreen(productId = screen.productId, viewModel = viewModel)
            is Screen.Dashboard -> DashboardScreen(viewModel = viewModel)
            is Screen.History -> HistoryScreen(viewModel = viewModel)
        }
    }
}
