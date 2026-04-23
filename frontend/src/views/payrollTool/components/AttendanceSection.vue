<template>
  <n-card title="考勤管理">
    <n-space vertical :size="16">
      <input
        ref="fileInputRef"
        type="file"
        accept=".xlsx"
        style="display: none"
        @change="handleFileChange"
      />

      <n-space align="center" wrap>
        <n-input
          v-model:value="yearMonth"
          placeholder="請輸入年月，例如 2026-04"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch" />
        <n-button type="primary" :loading="loading" @click="handleSearch"> 查詢考勤 </n-button>
        <n-button :disabled="loading || importing || !hasEmployees" @click="handleImport">
          匯入考勤
        </n-button>
        <n-button :disabled="loading" @click="handleReset"> 重設 </n-button>
      </n-space>

      <n-alert v-if="!hasEmployees" type="warning">
        請先匯入人員基本資料後，才能匯入考勤資料
      </n-alert>

      <n-alert v-if="errorMessage" type="error" closable @close="errorMessage = ''">
        {{ errorMessage }}
      </n-alert>

      <n-alert v-if="importErrorMessage" type="error" closable @close="importErrorMessage = ''">
        {{ importErrorMessage }}
      </n-alert>

      <n-alert v-if="importResult" type="success" closable @close="importResult = null">
        匯入完成：新增 {{ importResult.insertedCount }} 筆，略過 {{ importResult.skippedCount }} 筆，
        {{ importResult.message }}
      </n-alert>

      <n-data-table
        :columns="columns"
        :data="attendanceList"
        :loading="loading"
        :bordered="false"
        :pagination="false"
        :single-line="false"
        empty-text="目前沒有考勤資料" />
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type { AxiosError } from 'axios';
import type { DataTableColumns } from 'naive-ui';

import { getAttendance, importAttendance } from '@/api/attendance';
import { getEmployees } from '@/api/employee';
import type {
  ApiMessageResponse,
  AttendanceImportResult,
  AttendanceRecord,
  AttendanceSearchParams,
} from '@/types/index';

const props = withDefaults(
  defineProps<{
    refreshKey?: number;
  }>(),
  {
    refreshKey: 0,
  },
);

const yearMonth = ref<AttendanceSearchParams['yearMonth']>('');
const loading = ref(false);
const importing = ref(false);
const hasEmployees = ref(false);
const errorMessage = ref('');
const importErrorMessage = ref('');
const importResult = ref<AttendanceImportResult | null>(null);
const attendanceList = ref<AttendanceRecord[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);

const columns: DataTableColumns<AttendanceRecord> = [
  {
    title: '員工代碼',
    key: 'employeeCode',
  },
  {
    title: '中文姓名',
    key: 'employeeName',
  },
  {
    title: '場地',
    key: 'siteName',
  },
  {
    title: '年月',
    key: 'yearMonth',
  },
  {
    title: '總時數',
    key: 'totalHours',
    render(row) {
      return row.totalHours.toFixed(2);
    },
  },
  {
    title: '應上班時數',
    key: 'scheduledHours',
    render(row) {
      return row.scheduledHours.toFixed(2);
    },
  },
  {
    title: '加班時數',
    key: 'overtimeHours',
    render(row) {
      return row.overtimeHours.toFixed(2);
    },
  },
];

const normalizeYearMonth = (value: string) => value.trim().replace(/\D/g, '');

const fetchEmployeeRequirement = async () => {
  try {
    const data = await getEmployees({});
    hasEmployees.value = data.items.length > 0;
  } catch (error) {
    hasEmployees.value = false;
    console.error(error);
  }
};

const fetchAttendance = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    const params: Partial<AttendanceSearchParams> = {};
    const normalizedYearMonth = normalizeYearMonth(yearMonth.value);

    if (normalizedYearMonth) {
      params.yearMonth = normalizedYearMonth;
    }

    const data = await getAttendance(params);
    attendanceList.value = data.items;
  } catch (error) {
    attendanceList.value = [];
    errorMessage.value = '查詢考勤資料失敗，請稍後再試。';
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  yearMonth.value = normalizeYearMonth(yearMonth.value);
  void fetchAttendance();
};

const handleReset = () => {
  yearMonth.value = '';
  errorMessage.value = '';
  importErrorMessage.value = '';
  importResult.value = null;
  void fetchAttendance();
};

const handleImport = () => {
  if (!hasEmployees.value) {
    importErrorMessage.value = '請先匯入人員基本資料後，才能匯入考勤資料';
    return;
  }

  importErrorMessage.value = '';
  importResult.value = null;
  fileInputRef.value?.click();
};

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0] ?? null;

  if (!file) {
    return;
  }

  importing.value = true;
  importErrorMessage.value = '';
  importResult.value = null;

  try {
    const data = await importAttendance(file);
    importResult.value = data;
    await fetchAttendance();
  } catch (error) {
    const axiosError = error as AxiosError<ApiMessageResponse>;
    importErrorMessage.value = axiosError.response?.data?.message ?? '匯入考勤資料失敗';
    console.error(error);
  } finally {
    importing.value = false;
    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }
  }
};

onMounted(() => {
  void fetchEmployeeRequirement();
  void fetchAttendance();
});

watch(
  () => props.refreshKey,
  () => {
    void fetchEmployeeRequirement();
    void fetchAttendance();
  },
);
</script>
