import { configureStore } from '@reduxjs/toolkit';
import receiptsReducer from './receiptsSlice';
import targetsReducer from './targetsSlice';

export const store = configureStore({
  reducer: {
    receipts: receiptsReducer,
    targets: targetsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 