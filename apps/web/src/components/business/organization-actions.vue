<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'
import {
  createOrganization as createOrganizationRequest,
  joinOrganization as joinOrganizationRequest,
} from '@/api/organizations'
import { apiErrorMessage } from '@/api/client'

const emit = defineEmits<{
  changed: []
}>()

const createOpen = ref(false)
const joinOpen = ref(false)
const submitting = ref(false)
const createForm = reactive({ name: '' })
const joinForm = reactive({ name: '' })

function openCreate() {
  createForm.name = ''
  createOpen.value = true
}

function openJoin() {
  joinForm.name = ''
  joinOpen.value = true
}

async function createOrganization() {
  if (!createForm.name.trim()) {
    ElMessage.warning('请输入组织名称')
    return
  }
  submitting.value = true
  try {
    await createOrganizationRequest(createForm.name.trim())
    ElMessage.success('组织创建成功')
    createOpen.value = false
    emit('changed')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '创建组织失败'))
  }
  finally {
    submitting.value = false
  }
}

async function joinOrganization() {
  if (!joinForm.name.trim()) {
    ElMessage.warning('请输入组织名称')
    return
  }
  submitting.value = true
  try {
    const result = await joinOrganizationRequest(joinForm.name.trim())
    ElMessage.success(result.message)
    joinOpen.value = false
    emit('changed')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加入组织失败'))
  }
  finally {
    submitting.value = false
  }
}

defineExpose({ openCreate, openJoin })
</script>

<template>
  <span class="inline-flex flex-wrap gap-2 max-sm:w-full">
    <el-button data-testid="join-org-button" @click="openJoin">
      加入组织
    </el-button>
    <el-button type="primary" data-testid="create-org-button" @click="openCreate">
      创建组织
    </el-button>
  </span>

  <el-dialog v-model="createOpen" title="创建组织" width="460px" destroy-on-close>
    <el-form label-position="top" @submit.prevent="createOrganization">
      <el-form-item label="组织名称" required>
        <el-input v-model="createForm.name" data-testid="create-org-name-input" maxlength="64" placeholder="例如：研发部门" @keyup.enter="createOrganization" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="createOpen = false">
        取消
      </el-button>
      <el-button type="primary" data-testid="create-org-submit-button" :loading="submitting" @click="createOrganization">
        创建
      </el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="joinOpen" title="加入组织" width="460px" destroy-on-close>
    <el-form label-position="top" @submit.prevent="joinOrganization">
      <el-form-item label="组织名称" required>
        <el-input v-model="joinForm.name" data-testid="join-org-name-input" placeholder="请输入要加入的组织名称" @keyup.enter="joinOrganization" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="joinOpen = false">
        取消
      </el-button>
      <el-button type="primary" data-testid="join-org-submit-button" :loading="submitting" @click="joinOrganization">
        加入
      </el-button>
    </template>
  </el-dialog>
</template>
