/**
 * Order Tracking Debug Utility
 * Helps test and debug order tracking in the chatbot
 */

// Function to directly test order lookup
function testOrderTracking(orderId) {
  console.log("🔍 Testing order tracking for ID:", orderId);
  
  // Check if OrderManager is available
  if (typeof OrderManager === 'undefined') {
    console.error("❌ OrderManager is not available! Make sure orders.js is loaded.");
    return "Error: OrderManager not found";
  }
  
  // Check if GeminiAPI is available
  if (typeof GeminiAPI === 'undefined') {
    console.error("❌ GeminiAPI is not available! Make sure gemini-api.js is loaded.");
    return "Error: GeminiAPI not found";
  }
  
  try {
    // Try direct lookup via OrderManager
    console.log("Attempting direct OrderManager lookup");
    const orderData = OrderManager.getOrderById(orderId);
    console.log("📋 Order data from OrderManager:", orderData);
    
    if (!orderData) {
      console.warn("⚠️ No order found with ID:", orderId);
      return `No order found with ID ${orderId}`;
    }
    
    // Try lookup via GeminiAPI
    console.log("Creating test GeminiAPI instance");
    const gemini = new GeminiAPI();
    
    // Force an order lookup
    console.log("Forcing order lookup via GeminiAPI");
    const result = gemini.forceOrderLookup(orderId);
    
    return {
      directOrderData: orderData,
      formattedResponse: result
    };
  } catch (error) {
    console.error("❌ Error testing order tracking:", error);
    return `Error: ${error.message}`;
  }
}

// Function to list all available orders
function listAllOrders() {
  console.log("📋 Listing all available orders");
  
  if (typeof OrderManager === 'undefined') {
    console.error("❌ OrderManager is not available! Make sure orders.js is loaded.");
    return "Error: OrderManager not found";
  }
  
  try {
    const allOrders = OrderManager.getAllOrders();
    console.log(`📦 Found ${allOrders.length} orders:`, allOrders.map(o => o.id));
    
    return allOrders.map(order => ({
      id: order.id,
      status: order.status,
      customer: order.customer?.name || 'Unknown',
      created: order.createdAt
    }));
  } catch (error) {
    console.error("❌ Error listing orders:", error);
    return `Error: ${error.message}`;
  }
}

// Function to test order detection in a message
function testOrderDetection(message) {
  console.log("🔍 Testing order ID detection in message:", message);
  
  if (typeof GeminiAPI === 'undefined') {
    console.error("❌ GeminiAPI is not available! Make sure gemini-api.js is loaded.");
    return "Error: GeminiAPI not found";
  }
  
  try {
    const gemini = new GeminiAPI();
    const extractedId = gemini.extractOrderId(message);
    
    console.log("🏷️ Extracted order ID:", extractedId);
    return extractedId;
  } catch (error) {
    console.error("❌ Error detecting order ID:", error);
    return `Error: ${error.message}`;
  }
}

// Expose functions to global scope for console use
window.orderDebug = {
  testOrderTracking,
  listAllOrders,
  testOrderDetection
};

// Log instructions when the script loads
console.log(
  "%c📦 Order Debug Utilities Loaded 📦",
  "font-size: 14px; font-weight: bold; color: #3dbdbd;"
);
console.log(
  "%cUse these functions to debug order tracking:" +
  "\n- orderDebug.testOrderTracking('LD-123456789')" +
  "\n- orderDebug.listAllOrders()" + 
  "\n- orderDebug.testOrderDetection('I want to track order LD-123456789')",
  "color: #666;"
); 