package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class User(
    @PrimaryKey val email: String,
    val name: String,
    val passwordPlain: String,
    val securityAnswer: String // Used for localized "Esqueci minha senha" password retrieval/reset
)

@Entity(tableName = "products")
data class Product(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val userId: String, // Linked to User.email as UID
    val name: String,
    val brand: String,
    val quantity: Double,
    val unitPrice: Double,
    val supermarket: String?,
    val timestamp: Long = System.currentTimeMillis(),
    val isBought: Boolean = false
) {
    val totalPrice: Double
        get() = quantity * unitPrice
}

@Entity(tableName = "price_history")
data class PriceHistory(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val userId: String, // Linked to User.email as UID
    val productName: String,
    val price: Double,
    val supermarket: String?,
    val timestamp: Long = System.currentTimeMillis()
)
