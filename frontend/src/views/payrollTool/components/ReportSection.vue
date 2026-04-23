<template>
  <n-card title="報表產出">
    <n-space vertical :size="16">
      <n-space align="center" wrap>
        <n-input
          v-model:value="startMonth"
          placeholder="例如 2026-03"
          clearable
          style="width: 180px"
          @keyup.enter="handleSearch" />
        <n-input
          v-model:value="endMonth"
          placeholder="例如 2026-03"
          clearable
          style="width: 180px"
          @keyup.enter="handleSearch" />
        <n-button type="primary" :loading="loading" @click="handleSearch"> 查詢報表 </n-button>
        <n-button :loading="exporting" :disabled="loading || exporting" @click="handleExport">
          匯出 Excel
        </n-button>
        <n-button :disabled="loading || exporting" @click="handleReset"> 重設 </n-button>
      </n-space>

      <n-alert v-if="errorMessage" type="error" closable @close="errorMessage = ''">
        {{ errorMessage }}
      </n-alert>

      <n-data-table
        :columns="columns"
        :data="reportItems"
        :loading="loading"
        :bordered="false"
        :pagination="false"
        :single-line="false"
        empty-text="目前沒有報表資料" />
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type { AxiosError } from 'axios';
import type { DataTableColumns } from 'naive-ui';

import { exportPayrollReport, getPayrollResults } from '@/api/payroll';
import type { ApiMessageResponse, PayrollResult } from '@/types';

const props = withDefaults(
  defineProps<{
    refreshKey?: number;
  }>(),
  {
    refreshKey: 0,
  },
);

interface ReportSearchParams {
  startMonth: string;
  endMonth: string;
}

const startMonth = ref<ReportSearchParams['startMonth']>('');
const endMonth = ref<ReportSearchParams['endMonth']>('');
const loading = ref(false);
const exporting = ref(false);
const errorMessage = ref('');
const reportItems = ref<PayrollResult[]>([]);

const formatAmount = (value: number) => value.toLocaleString();
const normalizeYearMonth = (value: string) => value.trim().replace(/\D/g, '');
const isValidYearMonth = (value: string) => /^\d{6}$/.test(value);
const hasValidMonthPart = (value: string) => {
  const month = Number(value.slice(4, 6));

  return month >= 1 && month <= 12;
};

const buildDefaultFileName = (startYearMonth: string, endYearMonth: string) => {
  return `payroll-report-${startYearMonth}-${endYearMonth}.xlsx`;
};

const extractFileName = (contentDisposition: string | undefined, fallbackFileName: string) => {
  if (!contentDisposition) {
    return fallbackFileName;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition.match(/filename="([^"]+)"/i);

  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return fallbackFileName;
};

const downloadBlobFile = (blob: Blob, fileName: string) => {
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

const extractBlobMessage = async (error: unknown) => {
  const axiosError = error as AxiosError<Blob | ApiMessageResponse>;
  const responseData = axiosError.response?.data;

  if (responseData instanceof Blob) {
    try {
      const text = await responseData.text();
      const parsed = JSON.parse(text) as ApiMessageResponse;

      return parsed.message || '匯出報表失敗';
    } catch {
      return '匯出報表失敗';
    }
  }

  return (responseData as ApiMessageResponse | undefined)?.message ?? '匯出報表失敗';
};

const getYearMonthRange = (startYearMonth: string, endYearMonth: string) => {
  const yearMonths: string[] = [];
  let year = Number(startYearMonth.slice(0, 4));
  let month = Number(startYearMonth.slice(4, 6));
  const endYear = Number(endYearMonth.slice(0, 4));
  const endMonthValue = Number(endYearMonth.slice(4, 6));

  while (year < endYear || (year === endYear && month <= endMonthValue)) {
    yearMonths.push(`${String(year).padStart(4, '0')}${String(month).padStart(2, '0')}`);
    month += 1;

    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return yearMonths;
};

const validateRange = () => {
  const normalizedStartMonth = normalizeYearMonth(startMonth.value);
  const normalizedEndMonth = normalizeYearMonth(endMonth.value);

  if (!normalizedStartMonth || !normalizedEndMonth) {
    errorMessage.value = '請輸入起訖月份';
    return null;
  }

  if (!isValidYearMonth(normalizedStartMonth) || !isValidYearMonth(normalizedEndMonth)) {
    errorMessage.value = '起訖月份格式需為 YYYYMM 或 YYYY-MM';
    return null;
  }

  if (!hasValidMonthPart(normalizedStartMonth) || !hasValidMonthPart(normalizedEndMonth)) {
    errorMessage.value = '起訖月份格式需為 YYYYMM 或 YYYY-MM';
    return null;
  }

  if (normalizedStartMonth > normalizedEndMonth) {
    errorMessage.value = '起始月份不可大於結束月份';
    return null;
  }

  startMonth.value = normalizedStartMonth;
  endMonth.value = normalizedEndMonth;

  return {
    startYearMonth: normalizedStartMonth,
    endYearMonth: normalizedEndMonth,
  };
};

const columns: DataTableColumns<PayrollResult> = [
  {
    title: '年月',
    key: 'yearMonth',
  },
  {
    title: '員工工號',
    key: 'employeeCode',
  },
  {
    title: '員工姓名',
    key: 'employeeName',
  },
  {
    title: '本薪',
    key: 'baseSalary',
    render(row) {
      return formatAmount(row.baseSalary);
    },
  },
  {
    title: '加班費',
    key: 'overtimePay',
    render(row) {
      return formatAmount(row.overtimePay);
    },
  },
  {
    title: '延長加班費',
    key: 'extendedOvertimePay',
    render(row) {
      return formatAmount(row.extendedOvertimePay);
    },
  },
  {
    title: '本薪調整',
    key: 'baseSalaryAdjustment',
    render(row) {
      return formatAmount(row.baseSalaryAdjustment);
    },
  },
  {
    title: '總金額',
    key: 'totalAmount',
    render(row) {
      return formatAmount(row.totalAmount);
    },
  },
];

const fetchReports = async () => {
  const validatedRange = validateRange();

  if (!validatedRange) {
    reportItems.value = [];
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const yearMonths = getYearMonthRange(
      validatedRange.startYearMonth,
      validatedRange.endYearMonth,
    );
    const results = await Promise.all(
      yearMonths.map(async (yearMonth) => {
        const data = await getPayrollResults({
          yearMonth,
        });

        return data.items;
      }),
    );

    reportItems.value = results.flat().sort((left, right) => {
      if (left.yearMonth !== right.yearMonth) {
        return left.yearMonth.localeCompare(right.yearMonth);
      }

      return left.employeeCode.localeCompare(right.employeeCode);
    });
  } catch (error) {
    const axiosError = error as AxiosError<ApiMessageResponse>;
    reportItems.value = [];
    errorMessage.value = axiosError.response?.data?.message ?? '查詢報表資料失敗，請稍後再試。';
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  void fetchReports();
};

const handleExport = async () => {
  const validatedRange = validateRange();

  if (!validatedRange) {
    return;
  }

  exporting.value = true;
  errorMessage.value = '';

  try {
    const response = await exportPayrollReport(validatedRange);
    const fallbackFileName = buildDefaultFileName(
      validatedRange.startYearMonth,
      validatedRange.endYearMonth,
    );
    const fileName = extractFileName(response.headers['content-disposition'], fallbackFileName);

    downloadBlobFile(response.data, fileName);
  } catch (error) {
    errorMessage.value = await extractBlobMessage(error);
    console.error(error);
  } finally {
    exporting.value = false;
  }
};

const handleReset = () => {
  startMonth.value = '';
  endMonth.value = '';
  errorMessage.value = '';
  reportItems.value = [];
};

const handleRefresh = () => {
  if (!startMonth.value.trim() || !endMonth.value.trim()) {
    errorMessage.value = '';
    reportItems.value = [];
    return;
  }

  void fetchReports();
};

onMounted(() => {
  reportItems.value = [];
});

watch(
  () => props.refreshKey,
  () => {
    handleRefresh();
  },
);
</script>
