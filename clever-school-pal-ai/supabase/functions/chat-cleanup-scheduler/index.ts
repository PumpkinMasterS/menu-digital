import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';

// ================================================================
// 🕐 EDGE FUNCTION: LIMPEZA AUTOMÁTICA DE CHAT - 5AM DIARIAMENTE
// ================================================================

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🕐 [5AM CLEANUP] Iniciando limpeza automática de chat...');
    const startTime = Date.now();

    // ================================================================
    // 📊 ESTATÍSTICAS ANTES DA LIMPEZA
    // ================================================================
    
    const { data: totalStats, error: statsError } = await supabase
      .from('chat_logs')
      .select('student_id, created_at')
      .order('created_at', { ascending: false });

    if (statsError) {
      console.error('❌ Erro ao buscar estatísticas:', statsError);
      throw statsError;
    }

    const totalMessagesBeforeCleanup = totalStats?.length || 0;
    const uniqueStudents = new Set(totalStats?.map(log => log.student_id)).size;
    
    console.log(`📊 ANTES DA LIMPEZA:`);
    console.log(`   Total de mensagens: ${totalMessagesBeforeCleanup}`);
    console.log(`   Estudantes únicos: ${uniqueStudents}`);

    // ================================================================
    // 🗑️ LIMPEZA DEFINITIVA POR ESTUDANTE (CONTEXTO DE 15 MENSAGENS)
    // ================================================================
    
    let cleanedStudents = 0;
    let totalMessagesDeleted = 0;
    const cleanupResults: any[] = [];

    // Buscar todos os estudantes com mensagens
    const { data: studentsWithChats, error: studentsError } = await supabase
      .from('chat_logs')
      .select('student_id')
      .order('created_at', { ascending: false });

    if (studentsError) {
      console.error('❌ Erro ao buscar estudantes:', studentsError);
      throw studentsError;
    }

    const uniqueStudentIds = [...new Set(studentsWithChats?.map(log => log.student_id))];
    
    console.log(`🔄 Processando ${uniqueStudentIds.length} estudantes...`);

    // Processar cada estudante individualmente
    for (const studentId of uniqueStudentIds) {
      try {
        console.log(`🔍 Processando estudante: ${studentId}`);

        // Buscar todas as interações do estudante
        const { data: studentChats, error: studentError } = await supabase
          .from('chat_logs')
          .select('id, created_at, question, answer')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });

        if (studentError || !studentChats) {
          console.error(`❌ Erro ao buscar chats do estudante ${studentId}:`, studentError);
          continue;
        }

        const currentMessageCount = studentChats.length;
        
        // Se tem mais que 7 interações (14 mensagens), limpar excesso
        if (currentMessageCount > 7) {
          const chatsToKeep = studentChats.slice(0, 7); // 7 mais recentes
          const chatsToDelete = studentChats.slice(7);  // Resto para apagar
          
          const idsToDelete = chatsToDelete.map(chat => chat.id);
          
          console.log(`🗑️ Estudante ${studentId}: ${currentMessageCount} interações → Mantendo 7, removendo ${chatsToDelete.length}`);
          
          // Executar limpeza
          const { error: deleteError } = await supabase
            .from('chat_logs')
            .delete()
            .in('id', idsToDelete);

          if (deleteError) {
            console.error(`❌ Erro ao limpar estudante ${studentId}:`, deleteError);
            cleanupResults.push({
              studentId,
              status: 'error',
              error: deleteError.message,
              messagesBefore: currentMessageCount,
              messagesAfter: currentMessageCount // Sem mudança por erro
            });
          } else {
            totalMessagesDeleted += chatsToDelete.length;
            cleanedStudents++;
            
            cleanupResults.push({
              studentId,
              status: 'success',
              messagesBefore: currentMessageCount,
              messagesAfter: 7,
              messagesDeleted: chatsToDelete.length
            });
            
            console.log(`✅ Estudante ${studentId}: Limpeza concluída (${chatsToDelete.length} mensagens removidas)`);
          }
        } else {
          console.log(`✅ Estudante ${studentId}: Já está dentro do limite (${currentMessageCount} interações)`);
          cleanupResults.push({
            studentId,
            status: 'no_action_needed',
            messagesBefore: currentMessageCount,
            messagesAfter: currentMessageCount,
            messagesDeleted: 0
          });
        }

      } catch (error) {
        console.error(`❌ Erro crítico ao processar estudante ${studentId}:`, error);
        cleanupResults.push({
          studentId,
          status: 'critical_error',
          error: error.message
        });
      }
    }

    // ================================================================
    // 🧹 LIMPEZA ADICIONAL: MENSAGENS ÓRFÃS E MUITO ANTIGAS
    // ================================================================
    
    console.log('🧹 Executando limpeza adicional...');
    
    // Remover mensagens com mais de 30 dias (backup de segurança)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: oldMessages, error: oldError } = await supabase
      .from('chat_logs')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString());

    let oldMessagesDeleted = 0;
    if (!oldError && oldMessages) {
      oldMessagesDeleted = Array.isArray(oldMessages) ? oldMessages.length : 0;
      console.log(`🗑️ Removidas ${oldMessagesDeleted} mensagens com mais de 30 dias`);
    }

    // ================================================================
    // 🧹 LIMPEZA DE STORAGE: REMOVER ARQUIVOS tmp-ocr > 24h
    // ================================================================
    console.log('🧹 Executando limpeza de storage tmp-ocr (>24h)...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let storageFilesDeleted = 0;
    try {
      // Buscar objetos antigos no bucket tmp-ocr
      const { data: oldTmpFiles, error: oldTmpFilesError } = await supabase
        .from('storage.objects')
        .select('name, created_at')
        .eq('bucket_id', 'tmp-ocr')
        .lt('created_at', twentyFourHoursAgo);
      if (oldTmpFilesError) {
        console.error('❌ Erro ao buscar arquivos antigos no tmp-ocr:', oldTmpFilesError);
      } else if (oldTmpFiles && oldTmpFiles.length > 0) {
        const pathsToRemove = oldTmpFiles.map(f => f.name).filter(Boolean);
        if (pathsToRemove.length > 0) {
          const { data: removed, error: removeError } = await supabase.storage
            .from('tmp-ocr')
            .remove(pathsToRemove);
          if (removeError) {
            console.error('❌ Erro ao remover arquivos antigos do tmp-ocr:', removeError);
          } else {
            storageFilesDeleted = Array.isArray(removed) ? removed.length : pathsToRemove.length;
            console.log(`🗑️ Removidos ${storageFilesDeleted} arquivos do tmp-ocr`);
          }
        }
      } else {
        console.log('✅ Nenhum arquivo antigo encontrado no tmp-ocr');
      }
    } catch (e) {
      console.error('❌ Erro crítico na limpeza do tmp-ocr:', e);
    }

    // ================================================================
    // 🧹 LIMPEZA DE ESTADOS PENDENTES DO WHATSAPP EXPIRADOS
    // ================================================================
    console.log('🧹 Limpando estados expirados de whatsapp_pending_flows...');
    let pendingFlowsDeleted = 0;
    try {
      const { data: deletedPending, error: deletePendingError } = await supabase
        .from('whatsapp_pending_flows')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (deletePendingError) {
        console.error('❌ Erro ao remover estados pendentes expirados:', deletePendingError);
      } else if (deletedPending) {
        pendingFlowsDeleted = Array.isArray(deletedPending) ? deletedPending.length : 0;
        console.log(`🗑️ Removidos ${pendingFlowsDeleted} estados pendentes expirados`);
      }
    } catch (e) {
      console.error('❌ Erro crítico ao limpar whatsapp_pending_flows:', e);
    }

    // ================================================================
    // 📊 ESTATÍSTICAS FINAIS
    // ================================================================
    
    const { data: finalStats } = await supabase
      .from('chat_logs')
      .select('id', { count: 'exact' });

    const totalMessagesAfterCleanup = finalStats?.length || 0;
    const processingTime = Date.now() - startTime;

    const summary = {
      timestamp: new Date().toISOString(),
      executionTime: `${processingTime}ms`,
      statistics: {
        before: {
          totalMessages: totalMessagesBeforeCleanup,
          uniqueStudents: uniqueStudents
        },
        after: {
          totalMessages: totalMessagesAfterCleanup,
          uniqueStudents: uniqueStudentIds.length
        },
        cleanup: {
          studentsProcessed: uniqueStudentIds.length,
          studentsWithCleanup: cleanedStudents,
          messagesDeletedByLimit: totalMessagesDeleted,
          oldMessagesDeleted: oldMessagesDeleted,
          totalMessagesDeleted: totalMessagesDeleted + oldMessagesDeleted,
          storageFilesDeleted: storageFilesDeleted,
          pendingFlowsDeleted: pendingFlowsDeleted
        }
      },
      results: cleanupResults
    };

    console.log('📊 RESULTADO FINAL DA LIMPEZA 5AM:');
    console.log(`   Mensagens antes: ${totalMessagesBeforeCleanup}`);
    console.log(`   Mensagens depois: ${totalMessagesAfterCleanup}`);
    console.log(`   Total removidas: ${summary.statistics.cleanup.totalMessagesDeleted}`);
    console.log(`   Estudantes processados: ${uniqueStudentIds.length}`);
    console.log(`   Estudantes com limpeza: ${cleanedStudents}`);
    console.log(`   Tempo de execução: ${processingTime}ms`);

    // ================================================================
    // 💾 SALVAR LOG DA LIMPEZA
    // ================================================================
    
    const { error: logError } = await supabase
      .from('system_logs')
      .insert({
        log_type: 'daily_chat_cleanup',
        level: 'info',
        message: `Limpeza automática 5AM concluída: ${summary.statistics.cleanup.totalMessagesDeleted} mensagens removidas`,
        metadata: summary,
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.error('❌ Erro ao salvar log da limpeza:', logError);
    } else {
      console.log('✅ Log da limpeza salvo com sucesso');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Limpeza automática de chat concluída com sucesso',
        summary
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro crítico na limpeza automática:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Falha na limpeza automática de chat',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});