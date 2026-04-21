<template>
  <n-card title="考勤管理">
    <n-space vertical :size="16">
      <n-space align="center" wrap>
        <n-input
          v-model:value="yearMonth"
          placeholder="請輸入年月，例如 2026-04"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch" />
        <n-button type="primary" :loading="loading" @click="handleSearch"> 查詢考勤 </n-button>
        <n-button :disabled="loading" @click="handleImport"> 匯入考勤 </n-button>
        <n-button :disabled="loading" @click="handleReset"> 重設 </n-button>
      </n-space>

      <n-alert v-if="errorMessage" type="error" closable @close="errorMessage = ''">
        {{ errorMessage }}
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
import { onMounted, ref } from 'vue';
import { http } from '@/api/http';
import type { DataTableColumns } from 'naive-ui';

import type { AttendanceRecord, AttendanceSearchParams, ApiListResponse } from '@/types/index';

const yearMonth = ref<AttendanceSearchParams['yearMonth']>('');
const loading = ref(false);
const errorMessage = ref('');
const attendanceList = ref<AttendanceRecord[]>([]);

const columns: DataTableColumns<AttendanceRecord> = [
  {
    title: '員工代碼',
    key: 'employeeCode',
  },
  {
    title: '中文姓名',
    key: 'chineseName',
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
];

const fetchAttendance = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    const params: Partial<AttendanceSearchParams> = {};

    if (yearMonth.value.trim()) {
      params.yearMonth = yearMonth.value.trim();
    }

    const { data } = await http.get<ApiListResponse<AttendanceRecord>>('/api/attendance', {
      params,
    });

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
  yearMonth.value = yearMonth.value.trim();
  void fetchAttendance();
};

const handleReset = () => {
  yearMonth.value = '';
  void fetchAttendance();
};

const handleImport = () => {
  window.alert('匯入功能開發中');
};

onMounted(() => {
  void fetchAttendance();
});
</script>
