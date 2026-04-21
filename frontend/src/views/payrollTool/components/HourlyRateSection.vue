<template>
  <n-card title="時薪管理">
    <n-space vertical :size="16">
      <n-space align="center" wrap>
        <n-input
          v-model:value="keyword"
          placeholder="請輸入工號、姓名或案場名稱"
          clearable
          style="width: 320px"
          @keyup.enter="handleSearch" />
        <n-button type="primary" :loading="loading" @click="handleSearch"> 查詢時薪 </n-button>
        <n-button :disabled="loading" @click="handleReset"> 重設 </n-button>
        <n-button :disabled="loading" @click="handleImport"> 匯入時薪 </n-button>
      </n-space>

      <n-alert v-if="errorMessage" type="error" closable @close="errorMessage = ''">
        {{ errorMessage }}
      </n-alert>

      <n-data-table
        :columns="columns"
        :data="hourlyRates"
        :loading="loading"
        :bordered="false"
        :pagination="false"
        :single-line="false"
        empty-text="目前沒有時薪資料" />
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';

import { http } from '@/api/http';
import type { ApiListResponse } from '@/types/apiTypes';
import type { SiteHourlyRate, SiteHourlyRateSearchParams } from '@/types/hourlyRate';

const keyword = ref<SiteHourlyRateSearchParams['keyword']>('');
const loading = ref(false);
const errorMessage = ref('');
const hourlyRates = ref<SiteHourlyRate[]>([]);

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
];

const fetchHourlyRates = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    const params: Partial<SiteHourlyRateSearchParams> = {};

    if (keyword.value.trim()) {
      params.keyword = keyword.value.trim();
    }

    const { data } = await http.get<ApiListResponse<SiteHourlyRate>>('/api/hourly-rates', {
      params,
    });

    hourlyRates.value = data.items;
  } catch (error) {
    hourlyRates.value = [];
    errorMessage.value = '查詢時薪資料失敗，請稍後再試。';
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  keyword.value = keyword.value.trim();
  void fetchHourlyRates();
};

const handleReset = () => {
  keyword.value = '';
  void fetchHourlyRates();
};

const handleImport = () => {
  window.alert('匯入功能開發中');
};

onMounted(() => {
  void fetchHourlyRates();
});
</script>
