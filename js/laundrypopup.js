// This file is for any custom popups used in the laundry application
// It works alongside the chatbot.js file

// Function to show a custom popup notification
function showNotification(message, type = 'info', duration = 3000) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas ${getIconForType(type)}"></i>
      <span>${message}</span>
    </div>
    <button class="close-notification">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Add to document
  document.body.appendChild(notification);
  
  // Show with animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Close button functionality
  const closeBtn = notification.querySelector('.close-notification');
  closeBtn.addEventListener('click', () => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  });
  
  // Auto close after duration
  if (duration) {
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.classList.remove('show');
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    }, duration);
  }
}

// Helper to get appropriate icon
function getIconForType(type) {
  switch (type) {
    case 'success':
      return 'fa-check-circle';
    case 'error':
      return 'fa-exclamation-circle';
    case 'warning':
      return 'fa-exclamation-triangle';
    case 'info':
    default:
      return 'fa-info-circle';
  }
}

// Add some CSS for the notifications
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 2000;
      max-width: 350px;
      transform: translateX(120%);
      transition: transform 0.3s ease;
    }
    
    .notification.show {
      transform: translateX(0);
    }
    
    .notification-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .notification.success .fa-check-circle {
      color: #10b981;
    }
    
    .notification.error .fa-exclamation-circle {
      color: #ef4444;
    }
    
    .notification.warning .fa-exclamation-triangle {
      color: #f59e0b;
    }
    
    .notification.info .fa-info-circle {
      color: #3b82f6;
    }
    
    .close-notification {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 5px;
      margin-left: 10px;
    }
    
    .close-notification:hover {
      color: #334155;
    }
  `;
  
  document.head.appendChild(style);
});

// Make function available globally
window.showNotification = showNotification; 