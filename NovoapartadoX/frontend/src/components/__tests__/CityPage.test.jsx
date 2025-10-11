import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import CityPage from '../../pages/CityPage'
import axios from 'axios'

// Mock do axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

const mockListings = [
  {
    _id: '1',
    title: 'Apartamento Lisboa',
    city: 'Lisboa',
    price: 1200,
    age: 25,
    verified: true,
    category: 'premium',
    images: ['image1.jpg']
  },
  {
    _id: '2',
    title: 'Casa Porto',
    city: 'Porto',
    price: 800,
    age: 30,
    verified: false,
    category: 'standard',
    images: ['image2.jpg']
  }
]

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('CityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAxios.get.mockResolvedValue({
      data: {
        listings: mockListings,
        total: 2,
        pages: 1,
        currentPage: 1
      }
    })
  })

  test('renderiza a página da cidade', async () => {
    renderWithProviders(<CityPage city="Lisboa" />)
    
    await waitFor(() => {
      expect(screen.getByText(/apartamento lisboa/i)).toBeInTheDocument()
    })
  })

  test('filtra por pesquisa', async () => {
    renderWithProviders(<CityPage city="Lisboa" />)
    
    await waitFor(() => {
      expect(screen.getByText(/apartamento lisboa/i)).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/pesquisar/i)
    fireEvent.change(searchInput, { target: { value: 'Porto' } })
    
    const searchButton = screen.getByText(/pesquisar/i)
    fireEvent.click(searchButton)

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('search=Porto')
      )
    })
  })

  test('aplica filtros de preço', async () => {
    renderWithProviders(<CityPage city="Lisboa" />)
    
    await waitFor(() => {
      expect(screen.getByText(/apartamento lisboa/i)).toBeInTheDocument()
    })

    const minPriceInput = screen.getByLabelText(/preço mínimo/i)
    const maxPriceInput = screen.getByLabelText(/preço máximo/i)
    
    fireEvent.change(minPriceInput, { target: { value: '500' } })
    fireEvent.change(maxPriceInput, { target: { value: '1000' } })
    
    const applyButton = screen.getByText(/aplicar filtros/i)
    fireEvent.click(applyButton)

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('minPrice=500&maxPrice=1000')
      )
    })
  })

  test('aplica filtros de idade', async () => {
    renderWithProviders(<CityPage city="Lisboa" />)
    
    await waitFor(() => {
      expect(screen.getByText(/apartamento lisboa/i)).toBeInTheDocument()
    })

    const minAgeInput = screen.getByLabelText(/idade mínima/i)
    const maxAgeInput = screen.getByLabelText(/idade máxima/i)
    
    fireEvent.change(minAgeInput, { target: { value: '20' } })
    fireEvent.change(maxAgeInput, { target: { value: '35' } })
    
    const applyButton = screen.getByText(/aplicar filtros/i)
    fireEvent.click(applyButton)

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('minAge=20&maxAge=35')
      )
    })
  })

  test('ordena por preço', async () => {
    renderWithProviders(<CityPage city="Lisboa" />)
    
    await waitFor(() => {
      expect(screen.getByText(/apartamento lisboa/i)).toBeInTheDocument()
    })

    const sortSelect = screen.getByLabelText(/ordenar por/i)
    fireEvent.change(sortSelect, { target: { value: 'price' } })

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('sortBy=price')
      )
    })
  })

  test('exibe loading durante carregamento', () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {})) // Never resolves
    
    renderWithProviders(<CityPage city="Lisboa" />)
    
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })
})