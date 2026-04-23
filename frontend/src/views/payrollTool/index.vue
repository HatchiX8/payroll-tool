<template>
  <EmployeeSection @employees-changed="handleEmployeesChanged" />
  <AttendanceSection :refresh-key="employeeRefreshKey" />

  <HourlyRateSection :refresh-key="employeeRefreshKey" />
  <PayrollSection :refresh-key="employeeRefreshKey" />
  <ReportSection :refresh-key="employeeRefreshKey" />
</template>

<script setup lang="ts">
import { ref } from 'vue';

import EmployeeSection from './components/EmployeeSection.vue';
import AttendanceSection from './components/AttendanceSection.vue';
import HourlyRateSection from './components/HourlyRateSection.vue';
import PayrollSection from './components/PayrollSection.vue';
import ReportSection from './components/ReportSection.vue';

const employeeRefreshKey = ref(0);

const handleEmployeesChanged = () => {
  employeeRefreshKey.value += 1;
};
</script>
