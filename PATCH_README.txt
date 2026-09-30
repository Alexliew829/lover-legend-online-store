Lover Legend Online Store V6.7 PATCH from V6.6

V6.7重点：
1. 新增「启用多子产品 / Variations」开关：OFF 直接用母产品编号上架；ON 才使用 Child ID。Random 保持独立。
2. 房间搜索继续显示已分配产品，但分配状态移到产品名附近，卡片更紧凑。
3. 房间搜索改用本地搜索索引 + 约 70ms 轻量 debounce，只对匹配结果计算房间/库存状态，减少卡顿。
4. Direct Parent Listing 纳入库存/房间分配保护与前台预览，不强制建立 -1 子编号。
5. 移除此房同时支持 Parent Direct Listing；不会删除 Import 产品或 Sold history。
6. 保留 V6.6 Save/Dirty、模板保存状态、Line Clear、金额输入与同步逻辑。
7. sync.js 未修改；Apps Script / Code.gs 无需重新部署。
