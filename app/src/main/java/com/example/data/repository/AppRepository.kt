package com.example.data.repository

import com.example.data.database.UserDao
import com.example.data.database.ProductDao
import com.example.data.database.PriceHistoryDao
import com.example.data.model.User
import com.example.data.model.Product
import com.example.data.model.PriceHistory
import kotlinx.coroutines.flow.Flow

class AppRepository(
    private val userDao: UserDao,
    private val productDao: ProductDao,
    private val priceHistoryDao: PriceHistoryDao
) {
    suspend fun getUserByEmail(email: String): User? = userDao.getUserByEmail(email)
    
    suspend fun registerUser(user: User): Long = userDao.insertUser(user)
    
    suspend fun updateUser(user: User) = userDao.updateUser(user)

    fun getAllProducts(userId: String): Flow<List<Product>> = productDao.getAllProducts(userId)
    
    suspend fun getProductById(id: Int): Product? = productDao.getProductById(id)
    
    /**
     * Inserts a product & automatically logs this entry into the PriceHistory database.
     */
    suspend fun insertProduct(product: Product): Long {
        val prodId = productDao.insertProduct(product)
        // Automatically generate a price history entry
        val history = PriceHistory(
            userId = product.userId,
            productName = product.name,
            price = product.unitPrice,
            supermarket = product.supermarket,
            timestamp = product.timestamp // match product timeline
        )
        priceHistoryDao.insertPriceHistory(history)
        return prodId
    }

    /**
     * Updates an existing product & optionally logs a new price history if price/supermarket changed.
     */
    suspend fun updateProduct(product: Product, logHistory: Boolean = false) {
        productDao.updateProduct(product)
        if (logHistory) {
            val history = PriceHistory(
                userId = product.userId,
                productName = product.name,
                price = product.unitPrice,
                supermarket = product.supermarket,
                timestamp = System.currentTimeMillis()
            )
            priceHistoryDao.insertPriceHistory(history)
        }
    }

    suspend fun toggleProductBought(product: Product) {
        productDao.updateProduct(product.copy(isBought = !product.isBought))
    }

    suspend fun deleteProduct(product: Product) = productDao.deleteProduct(product)
    
    suspend fun deleteProductById(id: Int) = productDao.deleteProductById(id)

    fun getPriceHistory(userId: String): Flow<List<PriceHistory>> = priceHistoryDao.getPriceHistory(userId)
    
    suspend fun insertPriceHistory(priceHistory: PriceHistory): Long = priceHistoryDao.insertPriceHistory(priceHistory)
    
    suspend fun deletePriceHistory(priceHistory: PriceHistory) = priceHistoryDao.deletePriceHistory(priceHistory)
}
