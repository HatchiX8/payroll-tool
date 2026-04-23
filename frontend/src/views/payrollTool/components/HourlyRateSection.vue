<template>
  <n-card title="時薪管理">
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
          v-model:value="keyword"
          placeholder="請輸入工號、姓名或案場名稱"
          clearable
          style="width: 320px"
          @keyup.enter="handleSearch" />
        <n-button type="primary" :loading="loading" @click="handleSearch"> 查詢時薪 </n-button>
        <n-button :disabled="loading" @click="handleReset"> 重設 </n-button>
        <n-button :disabled="loading || saving" @click="openCreateModal"> 新增時薪 </n-button>
        <n-button :disabled="loading || importing" @click="handleImport"> 匯入時薪 </n-button>
      </n-space>

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
        :data="hourlyRates"
        :loading="loading"
        :bordered="false"
        :pagination="false"
        :single-line="false"
        empty-text="目前沒有時薪資料" />

      <n-modal v-model:show="showFormModal" preset="card" :mask-closable="false" style="width: 640px">
        <template #header>
          {{ isEditMode ? '編輯時薪' : '新增時薪' }}
        </template>

        <n-space vertical :size="16">
          <n-alert v-if="formErrorMessage" type="error" closable @close="formErrorMessage = ''">
            {{ formErrorMessage }}
          </n-alert>

          <n-grid :cols="2" :x-gap="12">
            <n-grid-item>
              <n-input v-model:value="form.employeeCode" placeholder="員工工號" />
            </n-grid-item>
            <n-grid-item>
              <n-input v-model:value="form.employeeName" placeholder="員工姓名" readonly />
            </n-grid-item>
            <n-grid-item>
              <n-input v-model:value="form.siteCode" placeholder="工作點代碼" />
            </n-grid-item>
            <n-grid-item>
              <n-input v-model:value="form.siteName" placeholder="工作點名稱" />
            </n-grid-item>
            <n-grid-item>
              <n-input-number
                v-model:value="form.hourlyRate"
                placeholder="約定時薪"
                :min="1"
                style="width: 100%"
              />
            </n-grid-item>
            <n-grid-item>
              <n-input v-model:value="form.effectiveDate" placeholder="生效日期，例如 2026-01-01" />
            </n-grid-item>
          </n-grid>

          <n-input
            v-model:value="form.note"
            type="textarea"
            placeholder="備註"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />

          <n-space justify="end">
            <n-button :disabled="saving" @click="handleCancelForm"> 取消 </n-button>
            <n-button type="primary" :loading="saving" @click="handleSubmitForm">
              {{ isEditMode ? '更新時薪' : '建立時薪' }}
            </n-button>
          </n-space>
        </n-space>
      </n-modal>
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref, watch } from 'vue';
import type { AxiosError } from 'axios';
import { NButton, type DataTableColumns } from 'naive-ui';

import { getEmployees } from '@/api/employee';
import {
  createHourlyRate,
  getHourlyRates,
  importHourlyRates,
  updateHourlyRate,
} from '@/api/hourlyRate';
import type {
  ApiMessageResponse,
  CreateSiteHourlyRatePayload,
  Employee,
  HourlyRateImportResult,
  SiteHourlyRate,
  SiteHourlyRateSearchParams,
} from '@/types';

const props = withDefaults(
  defineProps<{
    refreshKey?: number;
  }>(),
  {
    refreshKey: 0,
  },
);

const keyword = ref<SiteHourlyRateSearchParams['keyword']>('');
const loading = ref(false);
const importing = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const importErrorMessage = ref('');
const formErrorMessage = ref('');
const importResult = ref<HourlyRateImportResult | null>(null);
const hourlyRates = ref<SiteHourlyRate[]>([]);
const employees = ref<Employee[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const showFormModal = ref(false);
const editingId = ref<number | null>(null);

const form = reactive({
  employeeCode: '',
  employeeName: '',
  siteCode: '',
  siteName: '',
  hourlyRate: null as number | null,
  effectiveDate: '',
  note: '',
});

const isEditMode = ref(false);

const syncEmployeeName = () => {
  const employeeCode = form.employeeCode.trim();
  const matchedEmployee = employees.value.find((employee) => employee.code === employeeCode);

  form.employeeName = matchedEmployee?.name ?? '';
};

const columns: DataTableColumns<SiteHourlyRate> = [
  {
    title: '員工工號',
    key: 'employeeCode',
  },
  {
    title: '員工姓名',
    key: 'employeeName',
  },
  {
    title: '工作點代碼',
    key: 'siteCode',
  },
  {
    title: '工作點名稱',
    key: 'siteName',
  },
  {
    title: '約定時薪',
    key: 'hourlyRate',
  },
  {
    title: '生效日期',
    key: 'effectiveDate',
  },
  {
    title: '備註',
    key: 'note',
    render(row) {
      return h('span', row.note && row.note.trim() ? row.note : '-');
    },
  },
  {
    title: '操作',
    key: 'actions',
    render(row) {
      return h(
        NButton,
        {
          size: 'small',
          onClick: () => openEditModal(row),
        },
        {
          default: () => '編輯',
        },
      );
    },
  },
];

const fetchHourlyRates = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    const params: Partial<SiteHourlyRateSearchParams> = {};

    if (keyword.value.trim()) {
      params.keyword = keyword.value.trim();
    }

    const data = await getHourlyRates(params);
    hourlyRates.value = data.items;
  } catch (error) {
    hourlyRates.value = [];
    errorMessage.value = '查詢時薪資料失敗，請稍後再試。';
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const fetchEmployees = async () => {
  try {
    const data = await getEmployees({});
    employees.value = data.items;
    syncEmployeeName();
  } catch (error) {
    employees.value = [];
    form.employeeName = '';
    console.error(error);
  }
};

const resetForm = () => {
  form.employeeCode = '';
  form.employeeName = '';
  form.siteCode = '';
  form.siteName = '';
  form.hourlyRate = null;
  form.effectiveDate = '';
  form.note = '';
};

const openCreateModal = () => {
  isEditMode.value = false;
  editingId.value = null;
  formErrorMessage.value = '';
  resetForm();
  showFormModal.value = true;
};

const openEditModal = (row: SiteHourlyRate) => {
  isEditMode.value = true;
  editingId.value = row.id;
  formErrorMessage.value = '';
  form.employeeCode = row.employeeCode;
  form.employeeName = row.employeeName;
  form.siteCode = row.siteCode;
  form.siteName = row.siteName;
  form.hourlyRate = row.hourlyRate;
  form.effectiveDate = row.effectiveDate;
  form.note = row.note ?? '';
  showFormModal.value = true;
};

const buildPayload = (): CreateSiteHourlyRatePayload | null => {
  const employeeCode = form.employeeCode.trim();
  const siteCode = form.siteCode.trim();
  const siteName = form.siteName.trim();
  const effectiveDate = form.effectiveDate.trim();
  const hourlyRate = form.hourlyRate;
  const matchedEmployee = employees.value.find((employee) => employee.code === employeeCode);

  if (!employeeCode || !siteCode || !siteName || !effectiveDate) {
    formErrorMessage.value = '請完整填寫必填欄位';
    return null;
  }

  if (!matchedEmployee) {
    formErrorMessage.value = '員工工號不存在於員工清單';
    form.employeeName = '';
    return null;
  }

  if (hourlyRate === null || Number.isNaN(hourlyRate) || hourlyRate <= 0) {
    formErrorMessage.value = '時薪必須為大於 0 的數字';
    return null;
  }

  form.employeeName = matchedEmployee.name;

  return {
    employeeCode,
    siteCode,
    siteName,
    hourlyRate,
    effectiveDate,
    note: form.note.trim() || null,
  };
};

const handleSearch = () => {
  keyword.value = keyword.value.trim();
  void fetchHourlyRates();
};

const handleReset = () => {
  keyword.value = '';
  errorMessage.value = '';
  importErrorMessage.value = '';
  importResult.value = null;
  void fetchHourlyRates();
};

const handleImport = () => {
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
    const data = await importHourlyRates(file);
    importResult.value = data;
    await fetchHourlyRates();
  } catch (error) {
    const axiosError = error as AxiosError<ApiMessageResponse>;
    importErrorMessage.value = axiosError.response?.data?.message ?? '匯入時薪資料失敗';
    console.error(error);
  } finally {
    importing.value = false;
    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }
  }
};

const handleCancelForm = () => {
  showFormModal.value = false;
  formErrorMessage.value = '';
  resetForm();
};

const handleSubmitForm = async () => {
  const payload = buildPayload();

  if (!payload) {
    return;
  }

  saving.value = true;
  formErrorMessage.value = '';
  errorMessage.value = '';

  try {
    if (isEditMode.value && editingId.value !== null) {
      await updateHourlyRate(editingId.value, payload);
    } else {
      await createHourlyRate(payload);
    }

    showFormModal.value = false;
    resetForm();
    await fetchHourlyRates();
  } catch (error) {
    const axiosError = error as AxiosError<ApiMessageResponse>;
    formErrorMessage.value = axiosError.response?.data?.message ?? '儲存時薪資料失敗';
    console.error(error);
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  void fetchEmployees();
  void fetchHourlyRates();
});

watch(
  () => form.employeeCode,
  () => {
    syncEmployeeName();
  },
);

watch(
  () => props.refreshKey,
  () => {
    void fetchEmployees();
    void fetchHourlyRates();
  },
);
</script>
