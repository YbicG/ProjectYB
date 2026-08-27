import { toast } from 'sonner'

export function useNotification() {
  return {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    warning: (message: string) => toast.warning(message),
    info: (message: string) => toast.info(message),
    
    serviceStarted: (name: string) => 
      toast.success(`Service ${name} started successfully`),
      
    serviceStopped: (name: string) => 
      toast.info(`Service ${name} stopped`),
      
    serviceCrashed: (name: string) => 
      toast.error(`Service ${name} crashed!`),
      
    gitCommitSuccess: (project: string) => 
      toast.success(`Committed changes in ${project}`),
      
    gitPushSuccess: (project: string) => 
      toast.success(`Pushed changes in ${project} to remote`)
  }
}
