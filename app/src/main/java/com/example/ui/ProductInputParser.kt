package com.example.ui

object ProductInputParser {
    fun parseOptionalNonNegativeDecimal(value: String): Double? {
        val normalized = value.trim().replace(",", ".")
        if (normalized.isBlank()) {
            return 0.0
        }

        val parsed = normalized.toDoubleOrNull() ?: return null
        return parsed.takeIf { it >= 0.0 }
    }

    fun formatOptionalDecimal(value: Double): String {
        if (value == 0.0) {
            return ""
        }
        return if (value % 1.0 == 0.0) {
            value.toInt().toString()
        } else {
            value.toString().replace(".", ",")
        }
    }
}
