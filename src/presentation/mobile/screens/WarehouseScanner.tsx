import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

/**
 * WarehouseScanner Screen (Mobile)
 * Purpose: Scan-based stock moves (T5.2.2).
 * Layout: BODEGAS_LAYOUT.md
 */
export const WarehouseScanner: React.FC = () => {
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [mode, setStep] = useState<'LOCATION' | 'PRODUCT' | 'CONFIRM'>('LOCATION');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {mode === 'LOCATION' && 'PASO 1: Escanea Ubicación (QR)'}
          {mode === 'PRODUCT' && 'PASO 2: Escanea Producto (SKU)'}
          {mode === 'CONFIRM' && 'PASO 3: Confirma Cantidad'}
        </Text>
      </View>

      <View style={styles.cameraPlaceholder}>
        <Text style={styles.placeholderText}>[ CÁMARA ACTIVA ]</Text>
      </View>

      <View style={styles.footer}>
        {lastScan && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Último escaneo: {lastScan}</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => setStep(mode === 'LOCATION' ? 'PRODUCT' : 'CONFIRM')}
        >
          <Text style={styles.buttonText}>SIMULAR ESCANEO EXITOSO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#0A192F' },
  title: { color: '#FFF', fontWeight: 'bold', textAlign: 'center' },
  cameraPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#FFF' },
  placeholderText: { color: '#FFF' },
  footer: { padding: 20, backgroundColor: '#FFF' },
  infoBox: { padding: 10, backgroundColor: '#F0F0F0', marginBottom: 10, borderRadius: 5 },
  infoText: { fontSize: 12, color: '#333' },
  button: { backgroundColor: '#007BFF', padding: 15, borderRadius: 10 },
  buttonText: { color: '#FFF', textAlign: 'center', fontWeight: 'bold' }
});
