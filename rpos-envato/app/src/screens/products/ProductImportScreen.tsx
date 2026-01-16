import React, { useState, useCallback } from 'react';
import { Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Loader,
  RefreshCw,
} from '@tamagui/lucide-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Button, Card, Select } from '@/components/ui';
import {
  useValidateImport,
  useCheckDuplicates,
  useExecuteImport,
  useDownloadTemplate,
  type ValidateResponse,
  type DuplicateCheckResponse,
  type DuplicateAction,
  type ImportResponse,
  PRODUCT_FIELDS,
} from '@/features/import';
import type { ProductScreenProps } from '@/navigation/types';

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  teal: '#14B8A6',
};

type Step = 'upload' | 'mapping' | 'review' | 'importing' | 'results';

export default function ProductImportScreen({ navigation }: ProductScreenProps<'ProductImport'>) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidateResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<DuplicateCheckResponse | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<DuplicateAction>('skip');
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);

  const validateMutation = useValidateImport();
  const duplicatesMutation = useCheckDuplicates();
  const importMutation = useExecuteImport();
  const downloadTemplate = useDownloadTemplate();

  const handleFilePick = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      setFileName(asset.name);

      // Create File object from URI
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const fileObj = new File([blob], asset.name, { type: asset.mimeType });
      setFile(fileObj);

      // Validate file
      validateMutation.mutate(fileObj, {
        onSuccess: (data) => {
          setValidationResult(data);
          setColumnMapping(data.columnMapping);
          setStep('mapping');
        },
        onError: (error) => {
          Alert.alert('Validation Error', error.message || 'Failed to validate file');
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to pick file');
    }
  }, []);

  const handleColumnMappingChange = (header: string, field: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [header]: field,
    }));
  };

  const handleCheckDuplicates = () => {
    if (!file) return;

    duplicatesMutation.mutate(
      { file, columnMapping },
      {
        onSuccess: (data) => {
          setDuplicates(data);
          setStep('review');
        },
        onError: (error) => {
          Alert.alert('Error', error.message || 'Failed to check duplicates');
        },
      }
    );
  };

  const handleImport = () => {
    if (!file) return;

    setStep('importing');

    importMutation.mutate(
      { file, columnMapping, duplicateAction },
      {
        onSuccess: (data) => {
          setImportResult(data);
          setStep('results');
        },
        onError: (error) => {
          Alert.alert('Import Error', error.message || 'Failed to import products');
          setStep('review');
        },
      }
    );
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setFileName('');
    setValidationResult(null);
    setColumnMapping({});
    setDuplicates(null);
    setImportResult(null);
  };

  const renderUploadStep = () => (
    <YStack gap="$4" flex={1}>
      <Card>
        <YStack padding="$4" gap="$4">
          <XStack alignItems="center" gap="$2">
            <Upload size={24} color={COLORS.primary} />
            <Text fontSize="$5" fontWeight="600">Upload Import File</Text>
          </XStack>

          <Text fontSize="$3" color="$colorSecondary">
            Upload a CSV or Excel file containing your product data. Make sure your file includes at least product names and prices.
          </Text>

          <TouchableOpacity onPress={handleFilePick}>
            <YStack
              backgroundColor="$backgroundHover"
              borderWidth={2}
              borderColor="$borderColor"
              borderStyle="dashed"
              borderRadius="$4"
              padding="$6"
              alignItems="center"
              gap="$3"
            >
              <FileSpreadsheet size={48} color={COLORS.primary} />
              <Text fontSize="$4" fontWeight="600" color="$color">
                {validateMutation.isPending ? 'Validating...' : 'Click to select file'}
              </Text>
              <Text fontSize="$2" color="$colorSecondary">
                Supports CSV, XLS, XLSX (Max 10MB, 1000 rows)
              </Text>
            </YStack>
          </TouchableOpacity>

          <XStack justifyContent="center" marginTop="$4">
            <Button
              variant="secondary"
              onPress={() => downloadTemplate.mutate()}
              disabled={downloadTemplate.isPending}
            >
              <Download size={16} color="$color" />
              <Text marginLeft="$2">Download Template</Text>
            </Button>
          </XStack>
        </YStack>
      </Card>
    </YStack>
  );

  const renderMappingStep = () => (
    <YStack gap="$4" flex={1}>
      <Card>
        <YStack padding="$4" gap="$4">
          <Text fontSize="$5" fontWeight="600">Map Columns</Text>
          <Text fontSize="$3" color="$colorSecondary">
            Match your file columns to product fields. We've auto-detected some mappings.
          </Text>

          {validationResult?.headers.map((header) => (
            <XStack key={header} alignItems="center" gap="$3">
              <Text flex={1} fontSize="$3" fontWeight="500" numberOfLines={1}>
                {header}
              </Text>
              <YStack flex={1}>
                <Select
                  options={[
                    { label: '-- Skip --', value: '' },
                    ...PRODUCT_FIELDS.map((f) => ({
                      label: f.label + (f.required ? ' *' : ''),
                      value: f.value,
                    })),
                  ]}
                  value={columnMapping[header] || ''}
                  onValueChange={(value) => handleColumnMappingChange(header, value)}
                />
              </YStack>
            </XStack>
          ))}
        </YStack>
      </Card>

      {/* Validation Summary */}
      {validationResult && (
        <Card>
          <YStack padding="$4" gap="$3">
            <Text fontSize="$4" fontWeight="600">Validation Summary</Text>

            <XStack justifyContent="space-between">
              <Text color="$colorSecondary">Total Rows:</Text>
              <Text fontWeight="600">{validationResult.totalRows}</Text>
            </XStack>

            <XStack justifyContent="space-between">
              <Text color="$colorSecondary">Valid Rows:</Text>
              <Text fontWeight="600" color={COLORS.success}>
                {validationResult.validation.validRows}
              </Text>
            </XStack>

            {validationResult.validation.errors.length > 0 && (
              <XStack justifyContent="space-between">
                <Text color="$colorSecondary">Errors:</Text>
                <Text fontWeight="600" color={COLORS.error}>
                  {validationResult.validation.errors.length}
                </Text>
              </XStack>
            )}

            {validationResult.validation.warnings.length > 0 && (
              <XStack justifyContent="space-between">
                <Text color="$colorSecondary">Warnings:</Text>
                <Text fontWeight="600" color={COLORS.warning}>
                  {validationResult.validation.warnings.length}
                </Text>
              </XStack>
            )}
          </YStack>
        </Card>
      )}

      <XStack gap="$3" paddingTop="$4">
        <Button variant="secondary" flex={1} onPress={() => setStep('upload')}>
          <Text>Back</Text>
        </Button>
        <Button
          variant="primary"
          flex={1}
          onPress={handleCheckDuplicates}
          disabled={duplicatesMutation.isPending || !validationResult?.validation.isValid}
        >
          {duplicatesMutation.isPending ? (
            <Loader size={16} color="white" />
          ) : (
            <Text color="white">Next</Text>
          )}
        </Button>
      </XStack>
    </YStack>
  );

  const renderReviewStep = () => (
    <YStack gap="$4" flex={1}>
      {/* Duplicate Summary */}
      {duplicates && duplicates.duplicateCount > 0 && (
        <Card>
          <YStack padding="$4" gap="$3">
            <XStack alignItems="center" gap="$2">
              <AlertTriangle size={20} color={COLORS.warning} />
              <Text fontSize="$4" fontWeight="600">Duplicates Found</Text>
            </XStack>

            <Text fontSize="$3" color="$colorSecondary">
              {duplicates.duplicateCount} products already exist in your inventory.
              Choose how to handle them:
            </Text>

            <Select
              label="Duplicate Action"
              options={[
                { label: 'Skip duplicates', value: 'skip' },
                { label: 'Update existing products', value: 'update' },
                { label: 'Create new (with new SKU)', value: 'create_new' },
              ]}
              value={duplicateAction}
              onValueChange={(v) => setDuplicateAction(v as DuplicateAction)}
            />
          </YStack>
        </Card>
      )}

      {/* Import Summary */}
      <Card>
        <YStack padding="$4" gap="$3">
          <Text fontSize="$4" fontWeight="600">Import Summary</Text>

          <XStack justifyContent="space-between">
            <Text color="$colorSecondary">File:</Text>
            <Text fontWeight="500" numberOfLines={1} flex={1} textAlign="right">
              {fileName}
            </Text>
          </XStack>

          <XStack justifyContent="space-between">
            <Text color="$colorSecondary">Total Products:</Text>
            <Text fontWeight="600">{validationResult?.totalRows || 0}</Text>
          </XStack>

          {duplicates && (
            <>
              <XStack justifyContent="space-between">
                <Text color="$colorSecondary">New Products:</Text>
                <Text fontWeight="600" color={COLORS.success}>
                  {duplicates.uniqueCount}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text color="$colorSecondary">Duplicates:</Text>
                <Text fontWeight="600" color={COLORS.warning}>
                  {duplicates.duplicateCount}
                </Text>
              </XStack>
            </>
          )}
        </YStack>
      </Card>

      <XStack gap="$3" paddingTop="$4">
        <Button variant="secondary" flex={1} onPress={() => setStep('mapping')}>
          <Text>Back</Text>
        </Button>
        <Button
          variant="primary"
          flex={1}
          onPress={handleImport}
          backgroundColor={COLORS.success}
        >
          <Text color="white">Start Import</Text>
        </Button>
      </XStack>
    </YStack>
  );

  const renderImportingStep = () => (
    <YStack flex={1} justifyContent="center" alignItems="center" gap="$4">
      <Loader size={48} color={COLORS.primary} />
      <Text fontSize="$5" fontWeight="600">Importing Products...</Text>
      <Text fontSize="$3" color="$colorSecondary">Please wait while we process your file</Text>
    </YStack>
  );

  const renderResultsStep = () => (
    <YStack gap="$4" flex={1}>
      <Card>
        <YStack padding="$4" gap="$4" alignItems="center">
          {importResult?.summary.failed === 0 ? (
            <CheckCircle size={64} color={COLORS.success} />
          ) : (
            <AlertTriangle size={64} color={COLORS.warning} />
          )}

          <Text fontSize="$5" fontWeight="600">
            {importResult?.summary.failed === 0 ? 'Import Complete!' : 'Import Completed with Issues'}
          </Text>

          <YStack width="100%" gap="$2">
            <XStack justifyContent="space-between" padding="$2" backgroundColor="$backgroundHover" borderRadius="$2">
              <Text>Products Created</Text>
              <Text fontWeight="600" color={COLORS.success}>
                {importResult?.summary.created || 0}
              </Text>
            </XStack>

            <XStack justifyContent="space-between" padding="$2" backgroundColor="$backgroundHover" borderRadius="$2">
              <Text>Products Updated</Text>
              <Text fontWeight="600" color={COLORS.primary}>
                {importResult?.summary.updated || 0}
              </Text>
            </XStack>

            <XStack justifyContent="space-between" padding="$2" backgroundColor="$backgroundHover" borderRadius="$2">
              <Text>Skipped</Text>
              <Text fontWeight="600" color={COLORS.warning}>
                {importResult?.summary.skipped || 0}
              </Text>
            </XStack>

            {(importResult?.summary.failed || 0) > 0 && (
              <XStack justifyContent="space-between" padding="$2" backgroundColor="#FEE2E2" borderRadius="$2">
                <Text>Failed</Text>
                <Text fontWeight="600" color={COLORS.error}>
                  {importResult?.summary.failed || 0}
                </Text>
              </XStack>
            )}
          </YStack>
        </YStack>
      </Card>

      <XStack gap="$3" paddingTop="$4">
        <Button variant="secondary" flex={1} onPress={handleReset}>
          <RefreshCw size={16} />
          <Text marginLeft="$2">Import More</Text>
        </Button>
        <Button variant="primary" flex={1} onPress={() => navigation.goBack()}>
          <Text color="white">Done</Text>
        </Button>
      </XStack>
    </YStack>
  );

  const renderStepContent = () => {
    switch (step) {
      case 'upload':
        return renderUploadStep();
      case 'mapping':
        return renderMappingStep();
      case 'review':
        return renderReviewStep();
      case 'importing':
        return renderImportingStep();
      case 'results':
        return renderResultsStep();
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'upload':
        return 'Import Products';
      case 'mapping':
        return 'Map Columns';
      case 'review':
        return 'Review Import';
      case 'importing':
        return 'Importing...';
      case 'results':
        return 'Import Results';
      default:
        return 'Import Products';
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
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
          <Text fontSize="$6" fontWeight="bold" flex={1}>
            {getStepTitle()}
          </Text>
        </XStack>

        {/* Step Indicator */}
        {step !== 'importing' && step !== 'results' && (
          <XStack padding="$4" gap="$2" justifyContent="center">
            {['upload', 'mapping', 'review'].map((s, i) => (
              <XStack key={s} alignItems="center" gap="$2">
                <YStack
                  width={24}
                  height={24}
                  borderRadius={12}
                  backgroundColor={
                    step === s
                      ? COLORS.primary
                      : ['upload', 'mapping', 'review'].indexOf(step) > i
                      ? COLORS.success
                      : '$borderColor'
                  }
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize={12} color="white" fontWeight="600">
                    {i + 1}
                  </Text>
                </YStack>
                {i < 2 && (
                  <YStack
                    width={40}
                    height={2}
                    backgroundColor={
                      ['upload', 'mapping', 'review'].indexOf(step) > i
                        ? COLORS.success
                        : '$borderColor'
                    }
                  />
                )}
              </XStack>
            ))}
          </XStack>
        )}

        <ScrollView flex={1} padding="$4">
          {renderStepContent()}
          <YStack height={40} />
        </ScrollView>
      </YStack>
    </KeyboardAvoidingView>
  );
}
