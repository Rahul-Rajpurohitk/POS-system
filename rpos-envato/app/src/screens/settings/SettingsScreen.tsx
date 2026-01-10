import React from 'react';
import { YStack, XStack, Text, ScrollView, Switch } from 'tamagui';
import {
  ArrowLeft, Globe, DollarSign, Percent, Moon, Printer, Users,
  Bell, Shield, ChevronRight
} from '@tamagui/lucide-icons';
import { Button, Card } from '@/components/ui';
import { useSettingsStore } from '@/store';
import type { MoreScreenProps } from '@/navigation/types';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

function SettingItem({ icon, title, subtitle, onPress, rightElement }: SettingItemProps) {
  return (
    <Card pressable={!!onPress} onPress={onPress} marginBottom="$2">
      <XStack alignItems="center" gap="$3">
        <YStack backgroundColor="$primary" padding="$2" borderRadius="$2" opacity={0.9}>
          {icon}
        </YStack>
        <YStack flex={1}>
          <Text fontSize="$4" fontWeight="500">{title}</Text>
          {subtitle && <Text fontSize="$2" color="$colorSecondary">{subtitle}</Text>}
        </YStack>
        {rightElement || (onPress && <ChevronRight size={20} color="$colorSecondary" />)}
      </XStack>
    </Card>
  );
}

export default function SettingsScreen({ navigation }: MoreScreenProps<'Settings'>) {
  const { settings, setDarkMode, setCurrency, setLanguage, setTax } = useSettingsStore();

  const currencies = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'];
  const languages = ['en', 'es', 'fr', 'de', 'zh'];

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
        <Text fontSize="$6" fontWeight="bold" flex={1}>Settings</Text>
      </XStack>

      <ScrollView flex={1} padding="$4">
        <YStack gap="$4">
          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="600" color="$colorSecondary" marginLeft="$2">
              APPEARANCE
            </Text>
            <SettingItem
              icon={<Moon size={20} color="white" />}
              title="Dark Mode"
              subtitle={settings.darkMode ? 'Enabled' : 'Disabled'}
              rightElement={
                <Switch
                  checked={settings.darkMode}
                  onCheckedChange={setDarkMode}
                  backgroundColor={settings.darkMode ? '$primary' : '$backgroundPress'}
                >
                  <Switch.Thumb animation="quick" backgroundColor="white" />
                </Switch>
              }
            />
          </YStack>

          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="600" color="$colorSecondary" marginLeft="$2">
              REGIONAL
            </Text>
            <SettingItem
              icon={<Globe size={20} color="white" />}
              title="Language"
              subtitle={settings.language.toUpperCase()}
              onPress={() => {
                const currentIndex = languages.indexOf(settings.language);
                const nextIndex = (currentIndex + 1) % languages.length;
                setLanguage(languages[nextIndex]);
              }}
            />
            <SettingItem
              icon={<DollarSign size={20} color="white" />}
              title="Currency"
              subtitle={settings.currency}
              onPress={() => {
                const currentIndex = currencies.indexOf(settings.currency);
                const nextIndex = (currentIndex + 1) % currencies.length;
                setCurrency(currencies[nextIndex]);
              }}
            />
            <SettingItem
              icon={<Percent size={20} color="white" />}
              title="Tax Rate"
              subtitle={`${settings.tax}%`}
              onPress={() => {
                const rates = [0, 5, 7.5, 10, 12.5, 15, 18, 20];
                const currentIndex = rates.indexOf(settings.tax);
                const nextIndex = (currentIndex + 1) % rates.length;
                setTax(rates[nextIndex]);
              }}
            />
          </YStack>

          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="600" color="$colorSecondary" marginLeft="$2">
              HARDWARE
            </Text>
            <SettingItem
              icon={<Printer size={20} color="white" />}
              title="Printers"
              subtitle={settings.connectedPrinter || 'Not connected'}
              onPress={() => navigation.navigate('Printers')}
            />
          </YStack>

          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="600" color="$colorSecondary" marginLeft="$2">
              STAFF
            </Text>
            <SettingItem
              icon={<Users size={20} color="white" />}
              title="Manage Staff"
              subtitle="Add, edit, or remove staff members"
              onPress={() => navigation.navigate('Staff')}
            />
          </YStack>

          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="600" color="$colorSecondary" marginLeft="$2">
              OTHER
            </Text>
            <SettingItem
              icon={<Bell size={20} color="white" />}
              title="Notifications"
              subtitle="Configure alerts and sounds"
              onPress={() => {}}
            />
            <SettingItem
              icon={<Shield size={20} color="white" />}
              title="Privacy & Security"
              subtitle="Data handling and permissions"
              onPress={() => {}}
            />
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
