import React, { useState } from 'react';
import { FlatList, Platform } from 'react-native';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { ArrowLeft, Printer, Bluetooth, Wifi, Check, RefreshCw } from '@tamagui/lucide-icons';
import { Button, Card, ConfirmModal } from '@/components/ui';
import { useSettingsStore } from '@/store';
import type { MoreScreenProps } from '@/navigation/types';

interface PrinterDevice {
  id: string;
  name: string;
  address: string;
  type: 'bluetooth' | 'wifi' | 'usb';
  isConnected: boolean;
}

const mockPrinters: PrinterDevice[] = [
  { id: '1', name: 'EPSON TM-T88V', address: 'AA:BB:CC:DD:EE:FF', type: 'bluetooth', isConnected: false },
  { id: '2', name: 'Star TSP143', address: '192.168.1.100', type: 'wifi', isConnected: false },
  { id: '3', name: 'POS-5890K', address: '11:22:33:44:55:66', type: 'bluetooth', isConnected: false },
];

export default function PrintersScreen({ navigation }: MoreScreenProps<'Printers'>) {
  const { settings, setConnectedPrinter } = useSettingsStore();
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [printers, setPrinters] = useState<PrinterDevice[]>(mockPrinters);
  const [testModal, setTestModal] = useState(false);

  const isWeb = Platform.OS === 'web';

  const handleScan = async () => {
    setScanning(true);
    // Simulate scanning delay
    setTimeout(() => {
      setScanning(false);
    }, 2000);
  };

  const handleConnect = async (printer: PrinterDevice) => {
    setConnecting(printer.id);
    // Simulate connection delay
    setTimeout(() => {
      setPrinters(prev => prev.map(p => ({
        ...p,
        isConnected: p.id === printer.id,
      })));
      setConnectedPrinter(printer.name);
      setConnecting(null);
    }, 1500);
  };

  const handleDisconnect = () => {
    setPrinters(prev => prev.map(p => ({ ...p, isConnected: false })));
    setConnectedPrinter(null);
  };

  const handleTestPrint = () => {
    if (isWeb) {
      window.print();
    } else {
      setTestModal(true);
    }
  };

  const connectedPrinter = printers.find(p => p.isConnected);

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack
        padding="$4"
        alignItems="center"
        gap="$3"
        backgroundColor="$cardBackground"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} />
        </Button>
        <Text fontSize="$6" fontWeight="bold" flex={1}>Printers</Text>
        {!isWeb && (
          <Button
            variant="secondary"
            size="sm"
            onPress={handleScan}
            disabled={scanning}
          >
            {scanning ? <Spinner size="small" /> : <RefreshCw size={18} />}
            <Text>{scanning ? 'Scanning...' : 'Scan'}</Text>
          </Button>
        )}
      </XStack>

      <YStack flex={1} padding="$4" gap="$4">
        {isWeb ? (
          <Card>
            <YStack alignItems="center" gap="$3" paddingVertical="$4">
              <YStack backgroundColor="$primary" padding="$4" borderRadius="$4" opacity={0.9}>
                <Printer size={48} color="white" />
              </YStack>
              <Text fontSize="$5" fontWeight="600">Web Printing</Text>
              <Text color="$colorSecondary" textAlign="center">
                On web, receipts are printed using your browser's print dialog.
                Make sure you have a printer configured in your system.
              </Text>
              <Button variant="primary" onPress={handleTestPrint} marginTop="$2">
                <Printer size={18} color="white" />
                <Text color="white">Test Print</Text>
              </Button>
            </YStack>
          </Card>
        ) : (
          <>
            {connectedPrinter && (
              <Card backgroundColor="$successLight">
                <XStack alignItems="center" gap="$3">
                  <YStack backgroundColor="$success" padding="$2" borderRadius="$2">
                    <Check size={24} color="white" />
                  </YStack>
                  <YStack flex={1}>
                    <Text fontWeight="600">Connected</Text>
                    <Text fontSize="$3" color="$colorSecondary">{connectedPrinter.name}</Text>
                  </YStack>
                  <Button variant="secondary" size="sm" onPress={handleDisconnect}>
                    <Text>Disconnect</Text>
                  </Button>
                </XStack>
              </Card>
            )}

            <YStack gap="$2">
              <Text fontSize="$3" fontWeight="600" color="$colorSecondary" marginLeft="$2">
                AVAILABLE PRINTERS
              </Text>
              <FlatList
                data={printers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Card marginBottom="$2">
                    <XStack alignItems="center" gap="$3">
                      <YStack
                        backgroundColor={item.isConnected ? '$success' : '$backgroundPress'}
                        padding="$2"
                        borderRadius="$2"
                      >
                        {item.type === 'bluetooth' ? (
                          <Bluetooth size={24} color={item.isConnected ? 'white' : '$colorSecondary'} />
                        ) : (
                          <Wifi size={24} color={item.isConnected ? 'white' : '$colorSecondary'} />
                        )}
                      </YStack>
                      <YStack flex={1}>
                        <Text fontWeight="600">{item.name}</Text>
                        <Text fontSize="$2" color="$colorSecondary">{item.address}</Text>
                      </YStack>
                      {item.isConnected ? (
                        <Button variant="primary" size="sm" onPress={handleTestPrint}>
                          <Text color="white">Test</Text>
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onPress={() => handleConnect(item)}
                          disabled={connecting === item.id}
                        >
                          {connecting === item.id ? (
                            <Spinner size="small" />
                          ) : (
                            <Text>Connect</Text>
                          )}
                        </Button>
                      )}
                    </XStack>
                  </Card>
                )}
                ListEmptyComponent={
                  <Card>
                    <YStack alignItems="center" paddingVertical="$6">
                      <Printer size={48} color="$colorSecondary" />
                      <Text color="$colorSecondary" marginTop="$2">
                        No printers found
                      </Text>
                      <Text fontSize="$2" color="$colorSecondary">
                        Tap "Scan" to search for nearby printers
                      </Text>
                    </YStack>
                  </Card>
                }
              />
            </YStack>
          </>
        )}
      </YStack>

      <ConfirmModal
        visible={testModal}
        onClose={() => setTestModal(false)}
        onConfirm={() => {
          console.log('Printing test receipt...');
          setTestModal(false);
        }}
        title="Test Print"
        message="This will print a test receipt to verify printer connection."
        confirmText="Print"
      />
    </YStack>
  );
}
