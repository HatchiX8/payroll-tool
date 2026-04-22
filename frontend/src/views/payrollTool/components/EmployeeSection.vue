<template>
  <n-card title="員工管理">
    <n-space vertical :size="16">
      <n-space align="center" wrap>
        <n-input v-model:value="form.code" placeholder="員工代碼" style="width: 180px" />
        <n-input v-model:value="form.name" placeholder="員工姓名" style="width: 180px" />
        <n-input v-model:value="form.phone" placeholder="電話" style="width: 180px" />
        <n-select
          v-model:value="form.status"
          :options="statusOptions"
          style="width: 140px"
        />
        <n-button type="primary" :loading="creating" @click="handleCreate">新增員工</n-button>
      </n-space>

      <n-space align="center" wrap>
        <n-input
          v-model:value="filters.keyword"
          placeholder="搜尋代碼、姓名或電話"
          clearable
          style="width: 320px"
          @keyup.enter="handleSearch"
        />
        <n-select
          v-model:value="filters.status"
          :options="filterStatusOptions"
          style="width: 160px"
        />
        <n-button type="primary" :loading="loading" @click="handleSearch">查詢</n-button>
        <n-button :disabled="loading || creating" @click="handleReset">重設</n-button>
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
        empty-text="目前沒有員工資料"
      />
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import type { AxiosError } from 'axios';
import { NTag, type DataTableColumns, type SelectOption } from 'naive-ui';

import { createEmployee, getEmployees } from '@/api/employee';
import type {
  ApiMessageResponse,
  Employee,
  EmployeeSearchParams,
  EmployeeStatus,
} from '@/types';

const loading = ref(false);
const creating = ref(false);
const errorMessage = ref('');
const employees = ref<Employee[]>([]);

const form = reactive({
  code: '',
  name: '',
  phone: '',
  status: 'active' as EmployeeStatus,
});

const filters = reactive<EmployeeSearchParams>({
  keyword: '',
  status: '',
});

const statusOptions: SelectOption[] = [
  { label: 'active', value: 'active' },
  { label: 'inactive', value: 'inactive' },
];

const filterStatusOptions: SelectOption[] = [
  { label: '全部狀態', value: '' },
  ...statusOptions,
];

const columns: DataTableColumns<Employee> = [
  {
    title: 'ID',
    key: 'id',
  },
  {
    title: '員工代碼',
    key: 'code',
  },
  {
    title: '員工姓名',
    key: 'name',
  },
  {
    title: '電話',
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
          default: () => (isActive ? 'active' : 'inactive'),
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

    if (filters.keyword.trim()) {
      params.keyword = filters.keyword.trim();
    }

    if (filters.status) {
      params.status = filters.status;
    }

    const data = await getEmployees(params);
    employees.value = data.items;
  } catch (error) {
    employees.value = [];
    errorMessage.value = '載入員工資料失敗';
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const resetCreateForm = () => {
  form.code = '';
  form.name = '';
  form.phone = '';
  form.status = 'active';
};

const handleCreate = async () => {
  creating.value = true;
  errorMessage.value = '';

  try {
    await createEmployee({
      code: form.code.trim(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      status: form.status,
    });

    resetCreateForm();
    await fetchEmployees();
  } catch (error) {
    const axiosError = error as AxiosError<ApiMessageResponse>;
    errorMessage.value = axiosError.response?.data?.message ?? '新增員工失敗';
    console.error(error);
  } finally {
    creating.value = false;
  }
};

const handleSearch = () => {
  filters.keyword = filters.keyword.trim();
  void fetchEmployees();
};

const handleReset = () => {
  filters.keyword = '';
  filters.status = '';
  void fetchEmployees();
};

onMounted(() => {
  void fetchEmployees();
});
</script>
