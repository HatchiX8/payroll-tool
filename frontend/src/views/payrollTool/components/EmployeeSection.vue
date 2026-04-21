<template>
  <n-card title="員工管理">
    <n-space vertical :size="16">
      <n-space align="center" wrap>
        <n-input
          v-model:value="keyword"
          placeholder="請輸入員工代碼或中文姓名"
          clearable
          style="width: 320px"
          @keyup.enter="handleSearch" />
        <n-button type="primary" :loading="loading" @click="handleSearch"> 搜尋 </n-button>
        <n-button :disabled="loading" @click="handleReset"> 重設 </n-button>
      </n-space>

      <n-alert v-if="errorMessage" type="error" closable @close="errorMessage = ''">
        {{ errorMessage }}
      </n-alert>

      <n-data-table
        :columns="columns"
        :data="employees"
        :loading="loading"
        :bordered="false"
        :pagination="false"
        :single-line="false"
        empty-text="目前沒有員工資料" />
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from 'vue';
import { http } from '@/api/http';
import { NTag, type DataTableColumns } from 'naive-ui';

import type { Employee, EmployeeSearchParams, ApiListResponse } from '@/types/index';

const keyword = ref<EmployeeSearchParams['keyword']>('');
const loading = ref(false);
const errorMessage = ref('');
const employees = ref<Employee[]>([]);

const columns: DataTableColumns<Employee> = [
  {
    title: '員工代碼',
    key: 'employeeCode',
  },
  {
    title: '中文姓名',
    key: 'chineseName',
  },
  {
    title: '手機',
    key: 'phone',
  },
  {
    title: '狀態',
    key: 'status',
    render(row) {
      const isActive = row.status === 'active';

      return h(
        NTag,
        {
          type: isActive ? 'success' : 'default',
          bordered: false,
        },
        {
          default: () => (isActive ? '啟用' : '停用'),
        },
      );
    },
  },
];

const fetchEmployees = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    const params: Partial<EmployeeSearchParams> = {};

    if (keyword.value.trim()) {
      params.keyword = keyword.value.trim();
    }

    const { data } = await http.get<ApiListResponse<Employee>>('/api/employees', {
      params,
    });

    employees.value = data.items;
  } catch (error) {
    employees.value = [];
    errorMessage.value = '查詢員工資料失敗，請稍後再試。';
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  keyword.value = keyword.value.trim();
  void fetchEmployees();
};

const handleReset = () => {
  keyword.value = '';
  void fetchEmployees();
};

onMounted(() => {
  void fetchEmployees();
});
</script>
