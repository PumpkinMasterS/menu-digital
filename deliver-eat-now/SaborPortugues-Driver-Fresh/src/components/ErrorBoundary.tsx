import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
    
    // Global error handler for unhandled JavaScript errors
    this.setupGlobalErrorHandler();
  }

  setupGlobalErrorHandler = () => {
    // Handle unhandled promise rejections
    const originalHandler = global.ErrorUtils?.getGlobalHandler?.();
    
    global.ErrorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
      console.error('Global error caught:', error);
      console.log('Is fatal:', isFatal);
      
      // Call original handler if it exists
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
      
      // Update state to show error boundary
      if (isFatal) {
        this.setState({ 
          hasError: true, 
          error,
          errorInfo: 'Fatal error detected by global handler'
        });
      }
    });
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log do erro para debugging
    console.log('Error details:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    // Update state with error info
    this.setState({
      errorInfo: errorInfo.componentStack
    });
  }

  handleRestart = () => {
    console.log('Restarting app from error boundary...');
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleShowDetails = () => {
    if (this.state.error) {
      const details = `Erro: ${this.state.error.message}\n\n` +
        `Stack: ${this.state.error.stack?.substring(0, 300)}...\n\n` +
        `Component Stack: ${this.state.errorInfo?.substring(0, 200)}...`;
      
      Alert.alert(
        'Detalhes do Erro',
        details,
        [{ text: 'OK' }]
      );
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.title}>Oops! Algo deu errado</Text>
            <Text style={styles.message}>
              A aplicação encontrou um erro inesperado. Tente reiniciar a aplicação.
            </Text>
            
            {this.state.error && (
              <Text style={styles.errorMessage}>
                Erro: {this.state.error.message}
              </Text>
            )}
            
            <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
              <Text style={styles.buttonText}>Tentar Novamente</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.detailsButton} onPress={this.handleShowDetails}>
              <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  errorMessage: {
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'monospace',
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
  },
  button: {
    backgroundColor: '#10B981',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  detailsButtonText: {
    color: '#666',
    fontSize: 14,
  },
});

export default ErrorBoundary;