import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "stravio_query_cache_v1",
  throttleTime: 1000,
});
