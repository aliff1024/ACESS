import { ContactForm } from './ContactForm'

export default async function ContactRoute(props: { searchParams?: Promise<{ category?: string }> }) {
  const searchParams = await props.searchParams || {}
  return <ContactForm initialCategory={searchParams.category || 'general'} />
}
