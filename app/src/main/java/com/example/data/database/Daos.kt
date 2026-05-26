package com.example.data.database

import androidx.room.*
import com.example.data.model.User
import com.example.data.model.Product
import com.example.data.model.PriceHistory
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE email = :email LIMIT 1")
    suspend fun getUserByEmail(email: String): User?

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insertUser(user: User): Long

    @Update
    suspend fun updateUser(user: User)
}

@Dao
interface ProductDao {
    @Query("SELECT * FROM products WHERE userId = :userId ORDER BY timestamp DESC")
    fun getAllProducts(userId: String): Flow<List<Product>>

    @Query("SELECT * FROM products WHERE id = :id LIMIT 1")
    suspend fun getProductById(id: Int): Product?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProduct(product: Product): Long

    @Update
    suspend fun updateProduct(product: Product)

    @Delete
    suspend fun deleteProduct(product: Product)

    @Query("DELETE FROM products WHERE id = :id")
    suspend fun deleteProductById(id: Int)
}

@Dao
interface PriceHistoryDao {
    @Query("SELECT * FROM price_history WHERE userId = :userId ORDER BY timestamp DESC")
    fun getPriceHistory(userId: String): Flow<List<PriceHistory>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPriceHistory(priceHistory: PriceHistory): Long

    @Delete
    suspend fun deletePriceHistory(priceHistory: PriceHistory)
}
