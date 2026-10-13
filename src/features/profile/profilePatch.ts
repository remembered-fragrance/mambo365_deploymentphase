/** Ba ô sửa được của hồ sơ, dạng chữ đang hiện trên form. */
export interface ProfileForm {
  readonly name: string;
  readonly username: string;
  readonly email: string;
}

/**
 * Chỉ những ô đã đổi so với bản đang lưu. Gửi cả ô chưa đổi là nguy hiểm: ô còn
 * trống vì dữ liệu chưa kịp nạp sẽ thành `null` = XOÁ tên đăng nhập / email trên server.
 * So sánh như server lưu: bỏ khoảng trắng; tên đăng nhập và email không phân biệt hoa thường.
 */
export const changedProfileFields = (saved: ProfileForm, form: ProfileForm): Partial<ProfileForm> => ({
  ...(form.name.trim() !== saved.name.trim() ? { name: form.name } : {}),
  ...(form.username.trim().toLowerCase() !== saved.username.trim().toLowerCase() ? { username: form.username } : {}),
  ...(form.email.trim().toLowerCase() !== saved.email.trim().toLowerCase() ? { email: form.email } : {}),
});
