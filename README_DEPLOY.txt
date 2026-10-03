Lover Legend Online Store Management Admin V1.01
================================================

部署方式：
1. 将本文件夹全部内容上传到 GitHub Pages repository 根目录。
2. 不需要 npm、不需要 build、不需要 .bat / Batch。
3. index.html 直接作为入口。
4. 首次部署后如浏览器仍显示旧缓存，请做一次 Hard Refresh；V1.01 Service Worker 会使用独立 cache name。

V1.01 定位：
- Clean Rewrite，参考 V12.2 的界面排版与 UI。
- Import / Inventory 只读；Online 不回写 Import 库存、平均成本或最低售价。
- Local Cache 暂作开发/测试资料层；正式云端数据库仍按架构备忘录后续接入。
- 没有高频 polling；Import 刷新使用启动、focus、visibility、storage event 与手动刷新。

主要已经写入的逻辑：
- VIP / Premium / Starter / Random 四个独立房间。
- Random 不建立 Child，母编号数量池，最多 5 Photo + 1 Video，上架数量受有效库存限制。
- Premium / Starter 最多 10 Child，可连续新增；Child 独立售价、尺寸、重量、1 Photo + 1 Video、独立草稿/上架。
- 草稿 / 上架 / 下架状态机；发布后有新草稿时显示“更新商品卡并上架”。
- Remove Room / Close 返回安全；未保存修改离开前确认。
- Import 最低售价只读更新不覆盖母产品默认售价。
- 卖家包邮与参考运费恢复建议值互不改动。
- Online Pending Reservation + Order ID / Line ID + ACK 模拟流程，防重复扣库存基础结构。
- Template 永久删除 tombstone，避免自动复活。
- Backup / Restore / History。

注意：
当前 Import Adapter 会优先尝试读取浏览器中的已知 Import local cache key；找不到时会使用 4 个只读示例产品，方便先检查 UI 与流程。
