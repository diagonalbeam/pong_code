<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { UploadFile, UploadFiles, UploadRawFile, UploadUserFile } from 'element-plus'
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: File[]
  limit?: number
  maxSizeMb?: number
  tip?: string
  testId?: string
}>(), {
  modelValue: () => [],
  limit: 5,
  maxSizeMb: 5,
  tip: '支持 png / jpg / jpeg / webp，最多 5 张，单张不超过 5MB',
})

const emit = defineEmits<{
  'update:modelValue': [files: File[]]
}>()

const ACCEPT = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp'
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const ALLOWED_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

const fileList = ref<UploadUserFile[]>([])

watch(
  () => props.modelValue,
  (files) => {
    if (!files.length && fileList.value.length)
      fileList.value = []
  },
)

function isAllowedFile(file: File) {
  if (ALLOWED_TYPES.has(file.type))
    return true
  const ext = `.${file.name.split('.').pop()?.toLowerCase() || ''}`
  return ALLOWED_EXTS.has(ext)
}

function syncModel(list: UploadUserFile[]) {
  const files = list
    .map(item => item.raw)
    .filter((file): file is UploadRawFile => !!file)
  emit('update:modelValue', files)
}

function onChange(uploadFile: UploadFile, uploadFiles: UploadFiles) {
  const raw = uploadFile.raw
  if (raw) {
    if (!isAllowedFile(raw)) {
      ElMessage.warning('仅支持 png / jpg / jpeg / webp 图片')
      fileList.value = uploadFiles.filter(item => item.uid !== uploadFile.uid)
      syncModel(fileList.value)
      return
    }
    if (raw.size > props.maxSizeMb * 1024 * 1024) {
      ElMessage.warning(`单张图片不能超过 ${props.maxSizeMb}MB`)
      fileList.value = uploadFiles.filter(item => item.uid !== uploadFile.uid)
      syncModel(fileList.value)
      return
    }
  }
  fileList.value = uploadFiles.slice(0, props.limit)
  syncModel(fileList.value)
}

function onRemove(_uploadFile: UploadFile, uploadFiles: UploadFiles) {
  fileList.value = uploadFiles
  syncModel(fileList.value)
}

function onExceed() {
  ElMessage.warning(`最多上传 ${props.limit} 张截图`)
}
</script>

<template>
  <div class="screenshot-upload" :data-testid="testId">
    <el-upload
      v-model:file-list="fileList"
      action="#"
      list-type="picture-card"
      :auto-upload="false"
      :limit="limit"
      :accept="ACCEPT"
      :on-change="onChange"
      :on-remove="onRemove"
      :on-exceed="onExceed"
    >
      <el-icon><Plus /></el-icon>
    </el-upload>
    <p v-if="tip" class="screenshot-upload__tip">
      {{ tip }}
    </p>
  </div>
</template>

<style scoped>
.screenshot-upload {
  width: 100%;
}

.screenshot-upload :deep(.el-upload-list--picture-card),
.screenshot-upload :deep(.el-upload--picture-card) {
  --el-upload-list-picture-card-size: 88px;
  --el-upload-picture-card-size: 88px;
}

.screenshot-upload__tip {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--pc-text-muted, var(--el-text-color-secondary));
}
</style>
