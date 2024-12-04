import Link from 'next/link'; // Import Next.js Link component
import { useState } from 'react'
import { useRouter } from 'next/router'; // Import useRouter
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
} from '@headlessui/react'
import {
  Bars3Icon,
  Cog6ToothIcon,
  HomeIcon,
  XMarkIcon,
  FolderIcon,
  EnvelopeIcon // Email Icon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/home', icon: HomeIcon, current: false },
  { name: 'Manage Email', href: '/manageEmailContact', icon: EnvelopeIcon, current: false },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Example({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [log, setLog] = useState('');
  const [value, setValue] = useState('5');
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState(null);

  const handleChange = (event) => {
    setValue(event.target.value);
  };

  const callProcessSitesApi = async () => {
    try {
      setLog('Calling Flask API...');
      const response = await fetch('http://127.0.0.1:5000/process-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setApiError(errorData);
        setLog('API call failed');
        return;
      }

      const data = await response.json();
      setApiResponse(data);
      setLog('API call succeeded');
    } catch (error) {
      console.error('Error calling Flask API:', error);
      setApiError(error.message);
      setLog('Error calling Flask API');
    }
  };
  
  const router = useRouter(); // Get the current route

  return (
    <>
      <div>
        {/* Mobile Sidebar */}
        <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-[closed]:opacity-0"
          />

          <div className="fixed inset-0 flex">
            <DialogPanel
              transition
              className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-[closed]:-translate-x-full"
            >
              <TransitionChild>
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5 duration-300 ease-in-out data-[closed]:opacity-0">
                  <button type="button" onClick={() => setSidebarOpen(false)} className="-m-2.5 p-2.5">
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon aria-hidden="true" className="h-6 w-6 text-white" />
                  </button>
                </div>
              </TransitionChild>
              {/* Sidebar component, swap this element with another sidebar if you like */}
              {/* Mobile Sidebar */}
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[#1e3364] px-6 pb-4">
                <div className="flex h-16 shrink-0 items-center">
                  <img
                    alt="Your Company"
                    src="/images/wingstar-logo.png"
                    className="h-8 w-auto bg-white p-1 rounded"
                  />
                </div>
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                      {navigation.map((item) => (
                      <li key={item.name}>
                    <Link
                      href={item.href}
                      className={classNames(
                        router.pathname === item.href
                          ? 'bg-[#17294d] text-white'
                          : 'text-[#B0E0E6] hover:bg-[#17294d] hover:text-white',
                        'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
                      )}
                      onClick={() => setSidebarOpen(false)} // Close the sidebar on navigation
                    >
                      <item.icon
                        aria-hidden="true"
                        className={classNames(
                          router.pathname === item.href
                            ? 'text-white'
                            : 'text-[#B0E0E6] group-hover:text-white',
                          'h-6 w-6 shrink-0'
                        )}
                      />
                      {item.name}
                    </Link>
                      </li>
                    ))}
                      </ul>
                    </li>
                    <li className="mt-auto">
                    <Link
                    href="/settings"
                    className={classNames(
                      router.pathname === '/settings'
                        ? 'bg-[#17294d] text-white'
                        : 'text-[#B0E0E6] hover:bg-[#17294d] hover:text-white',
                      'group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
                    )}
                    onClick={() => setSidebarOpen(false)} // Close the sidebar on navigation
                  >
                    <Cog6ToothIcon
                      aria-hidden="true"
                      className={classNames(
                        router.pathname === '/settings'
                          ? 'text-white'
                          : 'text-[#B0E0E6] group-hover:text-white',
                        'h-6 w-6 shrink-0'
                      )}
                    />
                    Settings
                  </Link>
                    </li>
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          {/* Sidebar component, swap this element with another sidebar if you like */}
          <div className="flex grow flex-col gap-y-5 overflow-y-auto px-6 pb-4 bg-[#1e3364]">
            <div className="flex h-16 shrink-0 items-center ">
            <img
              alt="Your Company"
              src="/images/wingstar-logo.png"
              className="h-8 w-auto bg-white p-1 rounded"
            />

            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                  <li key={item.name}>
                           <Link
                              href={item.href}
                              className={classNames(
                                router.pathname === item.href
                                  ? 'bg-[#17294d] text-white'
                                  : 'text-[#B0E0E6] hover:bg-[#17294d] hover:text-white',
                                'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
                              )}
                            >
                              <item.icon
                                aria-hidden="true"
                                className={classNames(
                                  router.pathname === item.href
                                    ? 'text-white'
                                    : 'text-[#B0E0E6] group-hover:text-white',
                                  'h-6 w-6 shrink-0'
                                )}
                              />
                              {item.name}
                            </Link>
                  </li>
                ))}
                  </ul>
                </li>
                <li className="mt-auto">
                <Link
                    href="/settings"
                    className={classNames(
                      router.pathname === '/settings'
                        ? 'bg-[#17294d] text-white'
                        : 'text-[#B0E0E6] hover:bg-[#17294d] hover:text-white',
                      'group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
                    )}
                  >
                    <Cog6ToothIcon
                      aria-hidden="true"
                      className={classNames(
                        router.pathname === '/settings'
                          ? 'text-white'
                          : 'text-[#B0E0E6] group-hover:text-white',
                        'h-6 w-6 shrink-0'
                      )}
                    />
                    Settings
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="lg:pl-72">
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 sm:gap-x-6 sm:px-6 lg:px-8">
            <button type="button" onClick={() => setSidebarOpen(true)} className="-m-2.5 p-2.5 text-gray-700 lg:hidden">
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon aria-hidden="true" className="h-6 w-6" />
            </button>


          </div>

          <main className="py-10">
            <div className="px-4 sm:px-6 lg:px-8">{ children }</div>
          </main>
        </div>
      </div>
    </>
  )
}
