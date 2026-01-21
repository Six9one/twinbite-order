import sys
import subprocess
import os
from PyQt6.QtCore import QUrl, Qt
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, 
    QHBoxLayout, QPushButton, QLabel, QSplitter
)
from PyQt6.QtWebEngineWidgets import QWebEngineView

class TwinPizzaApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Twin Pizza - Ordering & Delivery Management")
        self.resize(1400, 800)
        
        # Main layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        
        # Splitter for the two web views
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # 1. Ordering System View (Left)
        self.order_view = QWebEngineView()
        self.order_view.load(QUrl("http://localhost:5173"))
        
        # 2. WhatsApp View (Right)
        self.whatsapp_view = QWebEngineView()
        self.whatsapp_view.load(QUrl("https://web.whatsapp.com"))
        
        splitter.addWidget(self.order_view)
        splitter.addWidget(self.whatsapp_view)
        splitter.setStretchFactor(0, 2)  # Order system takes more space
        splitter.setStretchFactor(1, 1)  # WhatsApp takes less space
        
        main_layout.addWidget(splitter)
        
        # Bottom Bar for Service Controls
        bottom_bar = QHBoxLayout()
        
        self.status_label = QLabel("Services: Starting...")
        bottom_bar.addWidget(self.status_label)
        
        btn_restart_order = QPushButton("Refresh Ordering UI")
        btn_restart_order.clicked.connect(lambda: self.order_view.reload())
        bottom_bar.addWidget(btn_restart_order)
        
        btn_open_bot = QPushButton("Start WhatsApp Bot Window")
        btn_open_bot.clicked.connect(self.start_bot)
        bottom_bar.addWidget(btn_open_bot)
        
        btn_open_print = QPushButton("Start Print Server Window")
        btn_open_print.clicked.connect(self.start_print)
        bottom_bar.addWidget(btn_open_print)
        
        main_layout.addLayout(bottom_bar)
        
    def start_bot(self):
        # Starts the bot in a separate CMD window for visibility
        cmd = 'start "WhatsApp Bot" cmd /k "cd /d whatsapp-bot-python && venv\\Scripts\\python bot.py"'
        subprocess.Popen(cmd, shell=True)
        
    def start_print(self):
        # Starts the print server in a separate CMD window
        cmd = 'start "Print Server" cmd /k "cd /d print-server && node server.js"'
        subprocess.Popen(cmd, shell=True)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = TwinPizzaApp()
    window.show()
    sys.exit(app.exec())
