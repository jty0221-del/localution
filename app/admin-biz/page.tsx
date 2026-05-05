import { redirect } from 'next/navigation'

export default function AdminBiz() {
 redirect('/settings?tab=store')
}
