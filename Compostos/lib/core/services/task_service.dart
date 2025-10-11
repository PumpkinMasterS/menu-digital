import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/core/services/api_service.dart';
import 'package:compostos/models/task_model.dart';
import 'package:compostos/core/mappers/task_mapper.dart';

final taskServiceProvider = Provider<TaskService>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return TaskService(dio: apiService.dio);
});

class TaskService {
  final Dio _dio;

  TaskService({required Dio dio}) : _dio = dio;

  // Buscar todas as tarefas disponíveis com status de completação
  Future<List<TaskModel>> getAvailableTasks() async {
    try {
      final response = await _dio.get('/api/tasks');
      final data = response.data;
      if (data['success'] == true && data['data'] is List) {
        return TaskMapper.listFromApiData(data['data'] as List);
      }
      throw Exception('Formato de resposta inválido para tarefas');
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401 || status == 403) {
        rethrow; // Propaga para fluxo de autenticação/permissão
      }
      throw Exception('Erro ao buscar tarefas: ${e.message}');
    }
  }

  // Buscar tarefas e completações do usuário
  Future<Map<String, dynamic>> getUserTasks() async {
    try {
      final response = await _dio.get('/api/tasks/user');
      final data = response.data;
      if (data['success'] == true && data['data'] is Map) {
        return data['data'] as Map<String, dynamic>;
      }
      throw Exception('Formato de resposta inválido para tarefas do usuário');
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401 || status == 403) {
        rethrow;
      }
      throw Exception('Erro ao buscar tarefas do usuário: ${e.message}');
    }
  }

  // Buscar tarefa específica por ID
  Future<TaskModel> getTaskById(String taskId) async {
    try {
      final response = await _dio.get('/api/tasks/$taskId');
      final data = response.data;
      if (data['success'] == true && data['data'] is Map) {
        return TaskMapper.fromApiData(data['data'] as Map<String, dynamic>);
      }
      throw Exception('Formato de resposta inválido para tarefa');
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401 || status == 403) {
        rethrow;
      }
      throw Exception('Erro ao buscar tarefa: ${e.message}');
    }
  }

  // Completar uma tarefa
  Future<Map<String, dynamic>> completeTask(String taskId, {Map<String, dynamic>? data}) async {
    try {
      final response = await _dio.post(
        '/api/tasks/$taskId/complete',
        data: data ?? {},
      );
      final responseData = response.data;
      if (responseData['success'] == true) {
        return responseData;
      }
      throw Exception(responseData['message'] ?? 'Falha ao completar tarefa');
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401 || status == 403) {
        rethrow;
      }
      throw Exception('Erro ao completar tarefa: ${e.message}');
    }
  }

  // Reivindicar recompensa de tarefa
  Future<Map<String, dynamic>> claimTaskReward(String completionId) async {
    try {
      final response = await _dio.post('/api/tasks/completions/$completionId/claim');
      final data = response.data;
      if (data['success'] == true) {
        return data;
      }
      throw Exception(data['message'] ?? 'Falha ao reivindicar recompensa');
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401 || status == 403) {
        rethrow;
      }
      throw Exception('Erro ao reivindicar recompensa: ${e.message}');
    }
  }

  // Buscar estatísticas de tarefas
  Future<Map<String, dynamic>> getTaskStats() async {
    try {
      final response = await _dio.get('/api/tasks/stats/overview');
      final data = response.data;
      if (data['success'] == true && data['data'] is Map) {
        return data['data'] as Map<String, dynamic>;
      }
      throw Exception('Formato de resposta inválido para estatísticas');
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401 || status == 403) {
        rethrow;
      }
      throw Exception('Erro ao buscar estatísticas de tarefas: ${e.message}');
    }
  }


}