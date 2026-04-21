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
        <n-button :disabled="loading" @click="handleExport"> 匯出 Excel </n-button>
        <n-button :disabled="loading" @click="handleReset"> 重設 </n-button>
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
import { onMounted, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';

import { http } from '@/api/http';
import type { ApiListResponse } from '@/types/apiTypes';
import type { PayrollResult } from '@/types/payrollResult';

interface ReportSearchParams {
  startMonth: string;
  endMonth: string;
}

const startMonth = ref<ReportSearchParams['startMonth']>('');
const endMonth = ref<ReportSearchParams['endMonth']>('');
const loading = ref(false);
const errorMessage = ref('');
const reportItems = ref<PayrollResult[]>([]);

const formatAmount = (value: number) => value.toLocaleString();

const columns: DataTableColumns<PayrollResult> = [
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
  loading.value = true;
  errorMessage.value = '';

  try {
    const params: Partial<ReportSearchParams> = {};

    if (startMonth.value.trim()) {
      params.startMonth = startMonth.value.trim();
    }

    if (endMonth.value.trim()) {
      params.endMonth = endMonth.value.trim();
    }

    const { data } = await http.get<ApiListResponse<PayrollResult>>('/api/report', {
      params,
    });

    reportItems.value = data.items;
  } catch (error) {
    reportItems.value = [];
    errorMessage.value = '查詢報表資料失敗，請稍後再試。';
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  startMonth.value = startMonth.value.trim();
  endMonth.value = endMonth.value.trim();
  void fetchReports();
};

const handleExport = () => {
  window.alert('匯出功能開發中');
};

const handleReset = () => {
  startMonth.value = '';
  endMonth.value = '';
  void fetchReports();
};

onMounted(() => {
  void fetchReports();
});
</script>
