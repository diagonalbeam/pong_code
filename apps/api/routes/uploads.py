"""通用上传 API：为 Markdown 编辑器保存粘贴或选择的图片。"""

import os
from datetime import datetime
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from flask_login import login_required


bp = Blueprint('uploads', __name__, url_prefix='/api')

MAX_MARKDOWN_IMAGE_COUNT = 10
MAX_MARKDOWN_IMAGE_SIZE = 5 * 1024 * 1024


def _detect_image_extension(header):
    """只相信文件签名，不允许把 HTML/SVG 伪装成可直接访问的图片。"""
    if header.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'png'
    if header.startswith(b'\xff\xd8\xff'):
        return 'jpg'
    if header.startswith((b'GIF87a', b'GIF89a')):
        return 'gif'
    if len(header) >= 12 and header[:4] == b'RIFF' and header[8:12] == b'WEBP':
        return 'webp'
    return None


def _file_size_and_header(file_storage):
    stream = file_storage.stream
    stream.seek(0, os.SEEK_END)
    size = stream.tell()
    stream.seek(0)
    header = stream.read(16)
    stream.seek(0)
    return size, header


@bp.route('/uploads/markdown-images', methods=['POST'])
@login_required
def upload_markdown_images():
    max_request_size = MAX_MARKDOWN_IMAGE_COUNT * MAX_MARKDOWN_IMAGE_SIZE + 1024 * 1024
    if request.content_length and request.content_length > max_request_size:
        return jsonify({'error': '单次上传内容过大'}), 413

    files = [
        file_storage
        for file_storage in request.files.getlist('images')
        if file_storage and file_storage.filename
    ]
    if not files:
        return jsonify({'error': '请选择要上传的图片'}), 400
    if len(files) > MAX_MARKDOWN_IMAGE_COUNT:
        return jsonify({'error': f'单次最多上传 {MAX_MARKDOWN_IMAGE_COUNT} 张图片'}), 400

    upload_root = current_app.config['MARKDOWN_IMAGE_UPLOAD_DIR']
    dated_folder = datetime.utcnow().strftime('%Y/%m')
    target_folder = os.path.join(upload_root, dated_folder)
    os.makedirs(target_folder, exist_ok=True)

    saved_paths = []
    urls = []
    try:
        for file_storage in files:
            file_size, header = _file_size_and_header(file_storage)
            if file_size <= 0:
                raise ValueError('不能上传空图片')
            if file_size > MAX_MARKDOWN_IMAGE_SIZE:
                raise ValueError('单张图片不能超过 5MB')

            extension = _detect_image_extension(header)
            if not extension:
                raise ValueError('只支持 PNG、JPG、GIF 或 WebP 图片')

            absolute_path = os.path.join(target_folder, f'{uuid4().hex}.{extension}')
            file_storage.save(absolute_path)
            saved_paths.append(absolute_path)

            relative_path = os.path.relpath(absolute_path, current_app.static_folder)
            urls.append(f"/static/{relative_path.replace(os.sep, '/')}")
    except ValueError as exc:
        for saved_path in saved_paths:
            if os.path.exists(saved_path):
                os.remove(saved_path)
        return jsonify({'error': str(exc)}), 400
    except Exception:
        for saved_path in saved_paths:
            if os.path.exists(saved_path):
                os.remove(saved_path)
        current_app.logger.exception('Markdown 图片上传失败')
        return jsonify({'error': '图片上传失败'}), 500

    return jsonify({'urls': urls}), 201
