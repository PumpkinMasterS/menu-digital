
import { Content } from "@/types";

export const filterContents = (
  contents: Content[],
  searchQuery: string,
  selectedSubject: string,
  selectedStatus: string,
  selectedSchool: string,
  selectedClass: string
) => {
  return contents.filter((content) => {
    const matchesSearch = content.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          content.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === "all" || content.subjectId === selectedSubject;
    const matchesStatus = selectedStatus === "all" || content.status === selectedStatus;
    const matchesSchool = selectedSchool === "all" || content.schoolId === selectedSchool;
    const matchesClass = selectedClass === "all" || 
                         (content.classId && content.classId.includes(selectedClass));
    
    return matchesSearch && matchesSubject && matchesStatus && matchesSchool && matchesClass;
  });
};

export const enrichContentsWithNames = (
  contents: Content[] | undefined,
  subjects: any[] | undefined,
  classes: any[] | undefined
) => {
  return contents?.map(content => {
    // Find class names
    const classNames = content.classId.map((id: string) => {
      const foundClass = classes?.find(c => c.id === id);
      return foundClass?.name || "";
    }).filter(Boolean);
    
    // Find school name through subject or class
    const subject = subjects?.find(s => s.id === content.subjectId);
    const schoolName = subject?.schoolName || 
      (content.classId.length > 0 && classes?.find(c => c.id === content.classId[0])?.schoolName) || 
      "Sem escola";
    
    return {
      ...content,
      className: classNames,
      schoolName
    };
  }) || [];
};
