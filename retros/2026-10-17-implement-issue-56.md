---
skill: implement-issue
issue: 56
pr: 74
area: panel
rutas: src/lib/metricas.ts, src/lib/fecha-metricas.ts, src/app/panel/metricas/, src/components/panel/, package.json
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-17
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** El primer commit usó el scope `deps`, que no existe. Lo rehice con `git reset --soft` antes de pushear. El test de página en rojo fallaba "bien" solo porque el stub no importaba `@/lib/metricas`: con la página real, el `vi.mock` sin `vi.hoisted` reventó y hubo que arreglar el test en verde. Un test en rojo puede ocultar un error de carga que aparece recién con la implementación.
**Decisiones no cubiertas:** No agregué el índice por `usuarios.creadoEn` que sugería el issue: sería un cambio de schema y la aprobación no lo cubría. Tampoco sumé `react-is@19` como dependencia directa, aunque npm resolvió el peer de recharts con 16.13.1, porque sería otra dependencia sin aprobar. Hice la barra inferior del panel scrolleable en celular: con 6 secciones de admin, las últimas quedaban afuera. Los 403 del panel salen con HTTP 200 (stream); comparé con `/panel/usuarios` para no reportarlo como bug nuevo.
**Lo que encontró la revisión:** `/code-review` dio 8 hallazgos y corregí 7. Los que valían: `inicioDelDia` leía el desfase en la medianoche UTC (falla con cambio de hora; lo probé con America/Santiago), los tipos de consulta fuera del enum hacían que la tarjeta y la serie no sumaran lo mismo, el padding faltante hacía que el overflow recortara la sombra del menú, y el margen negativo del eje Y podía cortar números grandes. El resto era duplicación y eficiencia. El falso: "dependencia sin aprobación", porque la aprobación estaba en un comentario del issue y el revisor no la veía. En el navegador encontré solo otras dos cosas: la leyenda amarilla no se leía y las etiquetas largas del eje se pisaban a 375 px.
**Propuesta:** En la lección de tests de páginas con mocks, usar siempre `vi.hoisted` para los mocks compartidos, aunque el stub en rojo no importe el módulo.
