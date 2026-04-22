<template>
  <n-card title="薪資計算">
    <n-space vertical :size="16">
      <n-space align="center" wrap>
        <n-input
          v-model:value="yearMonth"
          placeholder="請輸入年月，例如 2026-04"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch"
        />
        <n-button type="primary" :loading="loading" @click="handleSearch">
          查詢結果
        </n-button>
        <n-button type="primary" secondary :loading="calculating" @click="handleCalculate">
          執行薪資計算
        </n-button>
        <n-button :disabled="loading || calculating" @click="handleReset">
          重設
        </n-button>
      </n-space>

      <n-alert v-if="errorMessage" type="error" closable @close="errorMessage = ''">
        {{ errorMessage }}
      </n-alert>

      <n-alert v-if="calculateResult" type="success" closable @close="calculateResult = null">
        計算完成：新增 {{ calculateResult.calculatedCount }} 筆，略過
        {{ calculateResult.skippedCount }} 筆，{{ calculateResult.message }}
      </n-alert>

      <n-card
        v-if="calculateResult && calculateResult.skippedItems.length > 0"
        size="small"
        title="略過清單"
      >
        <n-space vertical :size="8">
          <div v-for="item in calculateResult.skippedItems" :key="`${item.employeeCode}-${item.reason}`">
            {{ item.employeeCode }} / {{ item.employeeName }} / {{ item.reason }}
          </div>
        </n-space>
      </n-card>

      <n-grid :cols="2" :x-gap="12" responsive="screen">
        <n-grid-item>
          <n-card size="small">
            <n-statistic label="計算筆數" :value="summaryCount" />
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card size="small">
            <n-statistic label="薪資總額" :value="summaryTotalAmount" />
          </n-card>
        </n-grid-item>
      </n-grid>

      <n-data-table
        :columns="columns"
        :data="payrollResults"
        :loading="loading"
        :bordered="false"
        :pagination="false"
        :single-line="false"
        empty-text="目前沒有薪資資料"
      />
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { AxiosError } from 'axios';
import type { DataTableColumns } from 'naive-ui';

import { calculatePayroll, getPayrollResults } from '@/api/payroll';
import type {
  ApiMessageResponse,
  PayrollCalculationResult,
  PayrollResult,
  PayrollSearchParams,
} from '@/types';

const yearMonth = ref<PayrollSearchParams['yearMonth']>('');
const loading = ref(false);
const calculating = ref(false);
const errorMessage = ref('');
const calculateResult = ref<PayrollCalculationResult | null>(null);
const payrollResults = ref<PayrollResult[]>([]);

const formatAmount = (value: number) => value.toLocaleString();
const normalizeYearMonth = (value: string) => value.trim().replace(/\D/g, '');
const isValidYearMonth = (value: string) => /^\d{6}$/.test(value);

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
    title: '應發總額',
    key: 'grossAmount',
    render(row) {
      return formatAmount(row.grossAmount);
    },
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

const summaryCount = computed(() => payrollResults.value.length);
const summaryTotalAmount = computed(() => {
  const total = payrollResults.value.reduce((sum, item) => sum + item.totalAmount, 0);

  return formatAmount(total);
});

const fetchPayrollResults = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    const params: Partial<PayrollSearchParams> = {};
    const normalizedYearMonth = normalizeYearMonth(yearMonth.value);

    if (normalizedYearMonth) {
      params.yearMonth = normalizedYearMonth;
    }

    const data = await getPayrollResults(params);
    payrollResults.value = data.items;
  } catch (error) {
    payrollResults.value = [];
    errorMessage.value = '查詢薪資資料失敗，請稍後再試。';
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  yearMonth.value = normalizeYearMonth(yearMonth.value);

  if (yearMonth.value && !isValidYearMonth(yearMonth.value)) {
    errorMessage.value = '年月格式錯誤，請輸入 YYYYMM 或 YYYY-MM';
    payrollResults.value = [];
    return;
  }

  void fetchPayrollResults();
};

const handleCalculate = async () => {
  const normalizedYearMonth = normalizeYearMonth(yearMonth.value);

  if (!normalizedYearMonth) {
    errorMessage.value = '請先輸入年月後再執行薪資計算';
    return;
  }

  if (!isValidYearMonth(normalizedYearMonth)) {
    errorMessage.value = '年月格式錯誤，請輸入 YYYYMM 或 YYYY-MM';
    return;
  }

  calculating.value = true;
  errorMessage.value = '';
  calculateResult.value = null;

  try {
    yearMonth.value = normalizedYearMonth;
    const result = await calculatePayroll({
      yearMonth: normalizedYearMonth,
    });
    calculateResult.value = result;
    await fetchPayrollResults();
  } catch (error) {
    const axiosError = error as AxiosError<ApiMessageResponse>;
    errorMessage.value = axiosError.response?.data?.message ?? '執行薪資計算失敗，請稍後再試。';
    console.error(error);
  } finally {
    calculating.value = false;
  }
};

const handleReset = () => {
  yearMonth.value = '';
  errorMessage.value = '';
  calculateResult.value = null;
  void fetchPayrollResults();
};

onMounted(() => {
  void fetchPayrollResults();
});
</script>
