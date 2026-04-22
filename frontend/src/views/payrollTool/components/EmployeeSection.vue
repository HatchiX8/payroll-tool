<template>
  <n-card title="員工管理">
    <n-space vertical :size="16">
      <n-space align="center" wrap>
        <n-input v-model:value="form.code" placeholder="員工代碼" style="width: 180px" />
        <n-input v-model:value="form.name" placeholder="員工姓名" style="width: 180px" />
        <n-input v-model:value="form.phone" placeholder="電話" style="width: 180px" />
        <n-input v-model:value="form.note" placeholder="備註" style="width: 180px" />
        <n-select v-model:value="form.status" :options="statusOptions" style="width: 140px" />
        <n-button type="primary" :loading="creating" @click="handleCreate">新增員工</n-button>
      </n-space>

      <n-space align="center" wrap>
        <div>
          <div style="margin-bottom: 8px">人員資料匯入</div>
          <input ref="fileInputRef" type="file" accept=".xlsx" @change="handleFileChange" />
        </div>
        <n-button
          type="primary"
          :loading="importing"
          :disabled="!selectedFile || importing"
          @click="handleImport">
          上傳匯入
        </n-button>
      </n-space>

      <n-alert v-if="importErrorMessage" type="error" closable @close="importErrorMessage = ''">
        {{ importErrorMessage }}
      </n-alert>

      <n-alert v-if="importResult" type="success">
        匯入完成：新增 {{ importResult.insertedCount }} 筆，略過
        {{ importResult.skippedCount }} 筆，
        {{ importResult.message }}
      </n-alert>

      <n-alert v-if="successMessage" type="success" closable @close="successMessage = ''">
        {{ successMessage }}
      </n-alert>

      <n-space align="center" wrap>
        <n-input
          v-model:value="filters.keyword"
          placeholder="搜尋代碼、姓名或電話"
          clearable
          style="width: 320px"
          @keyup.enter="handleSearch" />
        <n-select
          v-model:value="filters.status"
          :options="filterStatusOptions"
          style="width: 160px" />
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
        empty-text="目前沒有員工資料" />

      <n-modal
        v-model:show="showEditModal"
        preset="card"
        title="編輯員工"
        :mask-closable="false"
        style="width: 640px">
        <n-space vertical :size="16">
          <n-input v-model:value="editForm.code" placeholder="員工代碼" />
          <n-input v-model:value="editForm.name" placeholder="員工姓名" />
          <n-input v-model:value="editForm.phone" placeholder="電話" />
          <n-input v-model:value="editForm.note" placeholder="備註" />
          <n-select v-model:value="editForm.status" :options="statusOptions" placeholder="狀態" />

          <n-space justify="end">
            <n-button :disabled="updating" @click="handleCancelEdit">取消</n-button>
            <n-button type="primary" :loading="updating" @click="handleUpdateEmployee">
              儲存
            </n-button>
          </n-space>
        </n-space>
      </n-modal>
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import type { AxiosError } from 'axios';
import { NButton, NTag, type DataTableColumns, type SelectOption } from 'naive-ui';

import {
  createEmployee,
  getEmployees,
  importEmployees,
  updateEmployee,
  updateEmployeeStatus,
} from '@/api/employee';
import type {
  ApiMessageResponse,
  Employee,
  ImportEmployeesResponse,
  EmployeeSearchParams,
  EmployeeStatus,
  UpdateEmployeePayload,
} from '@/types';

const loading = ref(false);
const creating = ref(false);
const importing = ref(false);
const updating = ref(false);
const togglingStatusId = ref<number | null>(null);
const errorMessage = ref('');
const successMessage = ref('');
const importErrorMessage = ref('');
const importResult = ref<ImportEmployeesResponse | null>(null);
const employees = ref<Employee[]>([]);
const selectedFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const showEditModal = ref(false);
const editingEmployeeId = ref<number | null>(null);

const form = reactive({
  code: '',
  name: '',
  phone: '',
  note: '',
  status: 'active' as EmployeeStatus,
});

const editForm = reactive({
  code: '',
  name: '',
  phone: '',
  note: '',
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

const filterStatusOptions: SelectOption[] = [{ label: '全部狀態', value: '' }, ...statusOptions];

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
    title: '備註',
    key: 'note',
    render(row) {
      return row.note || '-';
    },
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
  {
    title: '操作',
    key: 'actions',
    render(row) {
      const nextStatus: EmployeeStatus = row.status === 'active' ? 'inactive' : 'active';
      const nextLabel = row.status === 'active' ? '設為 inactive' : '設為 active';

      return h('div', { style: 'display: flex; gap: 8px;' }, [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => openEditModal(row),
          },
          { default: () => '編輯' },
        ),
        h(
          NButton,
          {
            size: 'small',
            type: row.status === 'active' ? 'warning' : 'success',
            loading: togglingStatusId.value === row.id,
            onClick: () => void handleToggleStatus(row.id, nextStatus),
          },
          { default: () => nextLabel },
        ),
      ]);
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
  form.note = '';
  form.status = 'active';
};

const resetEditForm = () => {
  editForm.code = '';
  editForm.name = '';
  editForm.phone = '';
  editForm.note = '';
  editForm.status = 'active';
};

const openEditModal = (employee: Employee) => {
  editingEmployeeId.value = employee.id;
  editForm.code = employee.code;
  editForm.name = employee.name;
  editForm.phone = employee.phone;
  editForm.note = employee.note;
  editForm.status = employee.status;
  errorMessage.value = '';
  successMessage.value = '';
  showEditModal.value = true;
};

const handleCancelEdit = () => {
  showEditModal.value = false;
  editingEmployeeId.value = null;
  resetEditForm();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0] ?? null;

  selectedFile.value = file;
  importErrorMessage.value = '';
  importResult.value = null;
};

const handleCreate = async () => {
  creating.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await createEmployee({
      code: form.code.trim(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      note: form.note.trim(),
      status: form.status,
    });

    resetCreateForm();
    await fetchEmployees();
    successMessage.value = '新增員工成功';
  } catch (error) {
    const axiosError = error as AxiosError<ApiMessageResponse>;
    errorMessage.value = axiosError.response?.data?.message ?? '新增員工失敗';
    console.error(error);
  } finally {
    creating.value = false;
  }
};

const buildEditPayload = (): UpdateEmployeePayload | null => {
  const code = editForm.code.trim();
  const name = editForm.name.trim();

  if (!code || !name) {
    errorMessage.value = '員工代碼與姓名為必填';
    return null;
  }

  return {
    code,
    name,
    phone: editForm.phone.trim(),
    note: editForm.note.trim(),
    status: editForm.status,
  };
};

const handleUpdateEmployee = async () => {
  if (editingEmployeeId.value === null) {
    return;
  }

  const payload = buildEditPayload();

  if (!payload) {
    return;
  }

  updating.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await updateEmployee(editingEmployeeId.value, payload);
    showEditModal.value = false;
    editingEmployeeId.value = null;
    resetEditForm();
    await fetchEmployees();
    successMessage.value = '更新員工成功';
  } catch (error) {
    const axiosError = error as AxiosError<ApiMessageResponse>;
    errorMessage.value = axiosError.response?.data?.message ?? '更新員工失敗';
    console.error(error);
  } finally {
    updating.value = false;
  }
};

const handleToggleStatus = async (id: number, status: EmployeeStatus) => {
  togglingStatusId.value = id;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await updateEmployeeStatus(id, { status });
    await fetchEmployees();
    successMessage.value = `員工狀態已更新為 ${status}`;
  } catch (error) {
    const axiosError = error as AxiosError<ApiMessageResponse>;
    errorMessage.value = axiosError.response?.data?.message ?? '更新員工狀態失敗';
    console.error(error);
  } finally {
    togglingStatusId.value = null;
  }
};

const handleImport = async () => {
  if (!selectedFile.value) {
    importErrorMessage.value = '請先選擇 xlsx 檔案';
    return;
  }

  importing.value = true;
  importErrorMessage.value = '';
  importResult.value = null;
  successMessage.value = '';

  try {
    const data = await importEmployees(selectedFile.value);
    importResult.value = data;
    selectedFile.value = null;
    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }
    await fetchEmployees();
  } catch (error) {
    const axiosError = error as AxiosError<ApiMessageResponse>;
    importErrorMessage.value = axiosError.response?.data?.message ?? '匯入員工資料失敗';
    console.error(error);
  } finally {
    importing.value = false;
  }
};

const handleSearch = () => {
  filters.keyword = filters.keyword.trim();
  void fetchEmployees();
};

const handleReset = () => {
  filters.keyword = '';
  filters.status = '';
  errorMessage.value = '';
  successMessage.value = '';
  void fetchEmployees();
};

onMounted(() => {
  void fetchEmployees();
});
</script>
