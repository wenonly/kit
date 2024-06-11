// 下载文件
export const downloadBlob = (url: string | Blob, downloadName?: string) => {
  if (typeof url === "object" && url instanceof Blob) {
    // eslint-disable-next-line no-param-reassign
    url = URL.createObjectURL(url); // 创建blob地址
  }
  const aLink = document.createElement("a");
  aLink.href = url;
  if (downloadName) {
    aLink.download = downloadName;
  }
  aLink.click();
};
