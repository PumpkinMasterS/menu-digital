import ModelAccountForm from '../components/ModelAccountForm'

function AdminCreateModel() {
  return (
    <div className="admin-page">
      <div className="dashboard-header">
        <h1>Criar Nova Modelo</h1>
      </div>
      <div className="dashboard-content">
        <ModelAccountForm />
      </div>
    </div>
  )
}

export default AdminCreateModel