import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import accountsReducer from './accountsSlice'
import contactsReducer from './contactsSlice'
import leadsReducer from './leadsSlice'
import activitiesReducer from './activitiesSlice'
import pipelineReducer from './pipelineSlice'
import dashboardReducer from './dashboardSlice'
import teamReducer from './teamSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    accounts: accountsReducer,
    contacts: contactsReducer,
    leads: leadsReducer,
    activities: activitiesReducer,
    pipeline: pipelineReducer,
    dashboard: dashboardReducer,
    team: teamReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
