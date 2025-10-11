import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Subject } from "@/types";

interface ContentFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedSchool: string;
  onSchoolChange: (value: string) => void;
  selectedClass: string;
  onClassChange: (value: string) => void;
  selectedSubject: string;
  onSubjectChange: (value: string) => void;
  selectedYear: string;
  onYearChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  schools: any[];
  classes: any[];
  subjects: Subject[];
}

const ContentFilter = ({
  searchQuery,
  onSearchChange,
  selectedSchool,
  onSchoolChange,
  selectedClass,
  onClassChange,
  selectedSubject,
  onSubjectChange,
  selectedYear,
  onYearChange,
  selectedStatus,
  onStatusChange,
  schools,
  classes,
  subjects
}: ContentFilterProps) => {
  return (
    <div className="flex flex-col gap-4 mb-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Buscar conteúdos..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      {/* Hierarchical filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* School filter */}
        <Select
          value={selectedSchool}
          onValueChange={onSchoolChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Escola" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as escolas</SelectItem>
            <SelectGroup>
              {schools?.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Year filter */}
        <Select
          value={selectedYear}
          onValueChange={onYearChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os anos</SelectItem>
            <SelectGroup>
              <SelectItem value="5">5º Ano</SelectItem>
              <SelectItem value="6">6º Ano</SelectItem>
              <SelectItem value="7">7º Ano</SelectItem>
              <SelectItem value="8">8º Ano</SelectItem>
              <SelectItem value="9">9º Ano</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Class filter - depends on school and year */}
        <Select
          value={selectedClass}
          onValueChange={onClassChange}
          disabled={selectedSchool === "all"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Turma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            <SelectGroup>
              {classes?.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                                      {cls.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        
        {/* Subject filter - depends on school and year */}
        <Select
          value={selectedSubject}
          onValueChange={onSubjectChange}
          disabled={selectedSchool === "all"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Disciplina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as disciplinas</SelectItem>
            <SelectGroup>
              {subjects?.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name} - {subject.grade}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        
        {/* Status filter */}
        <Select
          value={selectedStatus}
          onValueChange={onStatusChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="ativo">✅ Ativos</SelectItem>
              <SelectItem value="desativado">❌ Desativados</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ContentFilter;
