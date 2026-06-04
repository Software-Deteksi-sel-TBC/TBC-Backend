import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Backend TBC Detection System",
      version: "1.0.0",
      description:
        "API untuk sistem manajemen lab dan skrining awal Tuberkulosis (TBC) dari citra histopatologi.",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        SuccessResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "success" },
            message: { type: "string" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            message: { type: "string" },
          },
        },
        PaginationMeta: {
          type: "object",
          properties: {
            total: { type: "integer" },
            page: { type: "integer" },
            limit: { type: "integer" },
          },
        },
        Role: {
          type: "string",
          enum: ["OPERATOR_LAB", "DOKTER_PATOLOGI", "ADMIN_AI"],
        },
        Sex: {
          type: "string",
          enum: ["LAKI_LAKI", "PEREMPUAN", "LAINNYA"],
        },
        CaseStatus: {
          type: "string",
          enum: ["PENDING_UPLOAD", "AI_PROCESSING", "PENDING_VALIDATION", "RESOLVED"],
        },
        QcStatus: {
          type: "string",
          enum: ["PENDING", "PASSED", "FAILED"],
        },
        QcFailureReason: {
          type: "string",
          enum: ["BLUR", "DARK", "BRIGHT", "NOISE"],
        },
        Magnification: {
          type: "string",
          enum: ["X10", "X40", "X100"],
        },
        Staining: {
          type: "string",
          enum: ["HE", "ZN"],
        },
        SeverityLevel: {
          type: "string",
          enum: ["SANGAT_RENDAH", "RENDAH", "SEDANG", "TINGGI", "SANGAT_TINGGI"],
        },
        HpfCountLevel: {
          type: "string",
          enum: ["TIDAK_ADA", "JARANG", "CUKUP_BANYAK", "SANGAT_BANYAK"],
        },
        Patient: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            no_induk: { type: "string", example: "3201010101010001" },
            bpjs_number: { type: "string", nullable: true },
            sex: { $ref: "#/components/schemas/Sex" },
            age: { type: "integer" },
            created_by: { type: "string", format: "uuid" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Case: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            patient_id: { type: "string", format: "uuid" },
            created_by: { type: "string", format: "uuid" },
            status: { $ref: "#/components/schemas/CaseStatus" },
            notes: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
            completed_at: { type: "string", format: "date-time", nullable: true },
          },
        },
        Image: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            original_filename: { type: "string" },
            magnification: { $ref: "#/components/schemas/Magnification" },
            qc_status: { $ref: "#/components/schemas/QcStatus" },
            qc_failure_reason: {
              $ref: "#/components/schemas/QcFailureReason",
              nullable: true,
            },
            view_url: { type: "string", nullable: true },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
