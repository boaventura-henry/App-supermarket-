package com.example

import com.example.ui.ProductInputParser
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProductInputParserTest {
    @Test
    fun blankValueDefaultsToZero() {
        assertEquals(0.0, ProductInputParser.parseOptionalNonNegativeDecimal("")!!, 0.0)
        assertEquals(0.0, ProductInputParser.parseOptionalNonNegativeDecimal("   ")!!, 0.0)
    }

    @Test
    fun acceptsCommaDecimalValues() {
        assertEquals(2.5, ProductInputParser.parseOptionalNonNegativeDecimal("2,5")!!, 0.0)
    }

    @Test
    fun rejectsInvalidOrNegativeValues() {
        assertNull(ProductInputParser.parseOptionalNonNegativeDecimal("abc"))
        assertNull(ProductInputParser.parseOptionalNonNegativeDecimal("-1"))
    }
}
